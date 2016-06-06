const React = require("react");
const {Router, Route, IndexRoute} = require("react-router");
const {createHashHistory} = require("history");
const {connect} = require("react-redux");

const history = createHashHistory({queryKey: false});
let isFirstLoad = true;

const Routes = React.createClass({
  componentDidMount() {
    this.unlisten = history.listen(location => {
      if (isFirstLoad) {
        isFirstLoad = false;
      }
      window.scroll(0, 0);
    });
  },
  componentWillUnmount() {
    this.unlisten();
  },
  render() {
    return (<Router history={history}>
      <Route path="/" component={require("components/Base/Base")}>
        <IndexRoute title="DebugPage" path="debug" component={require("components/DebugPage/DebugPage")} />
      </Route>
    </Router>);
  }
});

module.exports = connect(() => ({}))(Routes);
