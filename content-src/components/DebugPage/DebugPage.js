const React = require("react");
const {connect} = require("react-redux");
const {selectNewTabSites, selectSpotlight} = require("selectors/selectors");
const {SpotlightItem} = require("components/Spotlight/Spotlight");
const GroupedActivityFeed = require("components/ActivityFeed/ActivityFeed");
const TopSites = require("components/TopSites/TopSites");

const DebugPage = React.createClass({
  getInitialState() {
    return {
      component: "Spotlight",
      dataSource: "Highlights"
    };
  },
  render() {
    return (<main className="debug-page">
      <div className="new-tab-wrapper">
        <h2>UI tester</h2>
        <div className="ui-tester">
          <div className="form-group">
            <label>UI Component</label>
            <select value={this.state.component} onChange={e => this.setState({component: e.target.value})}>
              <option value={"Spotlight"}>Spotlight</option>
              <option value={"TopSites"}>Top Sites</option>
              <option value={"ActivityFeed"}>Activity Feed</option>
            </select>
          </div>
          <div className="form-group">
            <label>Data Source</label>
            <select value={this.state.dataSource} onChange={e => this.setState({dataSource: e.target.value})}>
              {Object.keys(this.props.raw).map(source => (<option key={source} value={source}>{source}</option>))}
            </select>
          </div>
        </div>
        <div>
          {this.state.component === "Spotlight" &&
            <div className="spotlight">
              {selectSpotlight({Highlights: this.props.raw[this.state.dataSource]}).rows.map((item, i) => (<SpotlightItem key={i} {...item} />))}
            </div>
          }
          {this.state.component === "TopSites" &&
            <TopSites
              sites={this.props.raw[this.state.dataSource].rows}
              length={this.props.raw[this.state.dataSource].rows.length} />
          }
          {this.state.component === "ActivityFeed" &&
            <GroupedActivityFeed
              sites={this.props.raw[this.state.dataSource].rows}
              length={this.props.raw[this.state.dataSource].rows.length} />
          }
        </div>
      </div>
    </main>);
  }
});

module.exports = connect(state => ({
  newTab: selectNewTabSites(state),
  raw: {
    TopSites: state.TopSites,
    History: state.History,
    Bookmarks: state.Bookmarks,
    Highlights: state.Highlights
  }
}))(DebugPage);

module.exports.DebugPage = DebugPage;
