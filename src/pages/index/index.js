import React from "react"
import Line from "./components/line"
import Bar from "./components/bar"
import "./index.scss"
import Draw from "./draw"
// import test from "./test"

import "./css3dRenderer"
export default class Index extends React.Component{

  componentDidMount(){
    const charts = document.querySelectorAll(".chart");
    const container = document.querySelector(".container")
    const draw = new Draw(container,charts)
    draw.render();
    // test()
  }

  render(){
    return (
      <div className={"container"}>
        <div className={"chart"}>
          <Line/>
        </div>
        <div className={"chart"}>
          <Bar></Bar>
        </div>
      </div>
    )
  }
}