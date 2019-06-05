import React from 'react';
import Dialog from "./components/dialog"
class App extends React.Component {
  constructor(props){
    super(props)
  }

  render() {
    return (
      <div className={this.path === "exhibition" ? "" : ""}>
        {
          Dialog
        }
      </div>
    )
  }
}

export default App;
