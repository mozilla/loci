const React = require("react");
const {connect} = require("react-redux");
const {justDispatch} = require("selectors/selectors");
const {actions} = require("common/action-manager");

const Base = React.createClass({
  componentDidMount() {
    this.props.dispatch(actions.RequestRecentLinks());
  },
  render() {
    return (<div id="base">
      {this.props.children}
    </div>);
  }
});

module.exports = connect(justDispatch)(Base);
