import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

function TestFuncComponent(prop){
    return <b>{prop.name}</b>;
}

class TestClassComponent extends Component {
    render() {
        return <i>{this.props.freeFormAttr}</i>;
    }
}

class App extends Component {
  render() {
    return (
      //  JSX
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h2>Welcome to React </h2>

            <TestFuncComponent name="test: TestFuncComponent-name"/>
            <TestClassComponent freeFormAttr="test: TestClassComponent-freeFormAttr"/>
        </div>
        <p className="App-intro">
          To get started, edit <code>src/App.js</code> and save to reload.
        </p>
      </div>
    );
  }
}

export default App;
