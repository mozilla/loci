const React = require("react");
const {connect} = require("react-redux");
const {justDispatch} = require("selectors/selectors");
const {actions} = require("common/action-manager");
const SiteIcon = require("components/SiteIcon/SiteIcon");
const {prettyUrl, getRandomFromTimestamp} = require("lib/utils");
const moment = require("moment");
const classNames = require("classnames");

const ICON_SIZE = 16;
const TOP_LEFT_ICON_SIZE = 20;
const SESSION_DIFF = 600000;
const CALENDAR_HEADINGS = {
  sameDay: "[Today]",
  nextDay: "[Tomorrow]",
  nextWeek: "dddd",
  lastDay: "[Yesterday]",
  lastWeek: "[Last] dddd",
  sameElse: "dddd MMMM D, YYYY"
};

const ActivityFeedItem = React.createClass({
  getInitialState() {
    return {showContextMenu: false};
  },
  getDefaultProps() {
    return {
      onShare() {},
      onClick() {},
      showDate: false
    };
  },
  render() {
    const site = this.props;
    const title = site.title || site.provider_display || (site.parsedUrl && site.parsedUrl.hostname);
    const date = site.dateDisplay;

    let icon;
    const iconProps = {
      ref: "icon",
      className: "feed-icon",
      site,
      iconSize: ICON_SIZE
    };
    if (site.showImage && site.images && site.images[0]) {
      icon = (<div className="feed-icon-image" style={{backgroundImage: `url(${site.images[0].url})`}}>
        <SiteIcon {...iconProps} width={TOP_LEFT_ICON_SIZE} height={TOP_LEFT_ICON_SIZE} />
      </div>);
    } else {
      icon = (<SiteIcon {...iconProps} />);
    }

    let dateLabel = "";
    if (date && this.props.showDate) {
      dateLabel = moment(date).calendar();
    } else if (date) {
      dateLabel = moment(date).format("h:mm A");
    }

    return (<li className={classNames("feed-item", {bookmark: site.bookmarkGuid, active: this.state.showContextMenu})}>
      <a onClick={this.props.onClick} href={site.url} ref="link">
        <span className="star" hidden={!site.bookmarkGuid} />
        {icon}
        <div className="feed-details">
          <div className="feed-description">
            <h4 className="feed-title" ref="title">{title}</h4>
            <span className="feed-url" ref="url" data-feed-url={prettyUrl(site.url)} />
            {this.props.preview}
          </div>
          <div className="feed-stats">
            <div ref="lastVisit" className="last-visit" data-last-visit={dateLabel} />
          </div>
        </div>
      </a>
    </li>);
  }
});

ActivityFeedItem.propTypes = {
  preview: React.PropTypes.object,
  page: React.PropTypes.string,
  source: React.PropTypes.string,
  index: React.PropTypes.number,
  onShare: React.PropTypes.func,
  onClick: React.PropTypes.func,
  url: React.PropTypes.string.isRequired,
  images: React.PropTypes.array,
  title: React.PropTypes.string,
  bookmarkTitle: React.PropTypes.string,
  type: React.PropTypes.string,
  dateDisplay: React.PropTypes.number,
  provider_display: React.PropTypes.string,
  parsedUrl: React.PropTypes.shape({hostname: React.PropTypes.string})
};

function groupSitesBySession(sites) {
  const sessions = [[]];
  sites.forEach((site, i) => {
    const currentSession = sessions[sessions.length - 1];
    const nextSite = sites[i + 1];
    currentSession.push(site);
    if (nextSite && Math.abs(site.dateDisplay - nextSite.dateDisplay) > SESSION_DIFF) {
      sessions.push([]);
    }
  });
  return sessions;
}

function groupSitesByDate(sites) {
  let groupedSites = new Map();
  for (let site of sites) {
    const date = site.dateDisplay;
    if (!Number.isInteger(date)) {
      continue;
    }

    let day = moment(date).startOf("day").format();
    if (!groupedSites.has(day)) {
      groupedSites.set(day, []);
    }
    groupedSites.get(day).push(site);
  }
  groupedSites.forEach((value, key) => {
    const sessions = groupSitesBySession(value);
    groupedSites.set(key, sessions);
  });
  return groupedSites;
}

const GroupedActivityFeed = React.createClass({
  getDefaultProps() {
    return {
      dateKey: "lastVisitDate",
      showDateHeadings: false
    };
  },
  onClickFactory(index) {
    return () => {
      this.props.dispatch(actions.NotifyEvent({
        event: "CLICK",
        page: this.props.page,
        source: "ACTIVITY_FEED",
        action_position: index
      }));
    };
  },
  onShareFactory(index) {
    return url => {
      alert("Sorry. We are still working on this feature."); // eslint-disable-line no-alert
      this.props.dispatch(actions.NotifyEvent({
        event: "SHARE",
        page: this.props.page,
        source: "ACTIVITY_FEED",
        action_position: index
      }));
    };
  },
  render() {
    let maxPreviews = this.props.maxPreviews;
    const sites = this.props.sites
      .slice(0, this.props.length)
      .map(site => Object.assign({}, site, {dateDisplay: site[this.props.dateKey]}));
    const groupedSites = groupSitesByDate(sites);
    let globalCount = -1;
    return (<div className="grouped-activity-feed">
      {Array.from(groupedSites.keys()).map((date, dateIndex) =>
        (<div className="group" key={date}>
          {this.props.showDateHeadings &&
            <h3 className="section-title">{moment(date).startOf("day").calendar(null, CALENDAR_HEADINGS)}</h3>
          }
          {groupedSites.get(date).map((sites, outerIndex) =>
            (<ul key={`${date}-${outerIndex}`} className="activity-feed">
              {sites.map((site, i) => {
                globalCount++;
                let preview = null;
                if (typeof maxPreviews === "undefined" || maxPreviews > 0) {
                  if (preview && !preview.previewURL) {
                    preview = null;
                  }
                  if (preview && maxPreviews >= 0) {
                    maxPreviews -= 1;
                  }
                }
                return (<ActivityFeedItem
                    key={site.guid || i}
                    onClick={this.onClickFactory(globalCount)}
                    onShare={this.onShareFactory(globalCount)}
                    showImage={getRandomFromTimestamp(0.2, site)}
                    index={globalCount}
                    page={this.props.page}
                    source="ACTIVITY_FEED"
                    showDate={!this.props.showDateHeadings && outerIndex === 0 && i === 0}
                    preview={preview}
                    {...site} />);
              })}
            </ul>)
          )}
        </div>)
      )}
    </div>);
  }
});

GroupedActivityFeed.propTypes = {
  sites: React.PropTypes.array.isRequired,
  length: React.PropTypes.number,
  dateKey: React.PropTypes.string,
  page: React.PropTypes.string,
  showDateHeadings: React.PropTypes.bool
};

module.exports = connect(justDispatch)(GroupedActivityFeed);
module.exports.ActivityFeedItem = ActivityFeedItem;
module.exports.GroupedActivityFeed = GroupedActivityFeed;
module.exports.groupSitesBySession = groupSitesBySession;
