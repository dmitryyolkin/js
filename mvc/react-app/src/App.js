import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

//components
import Clock from './components/Clock';
import Toggle from './components/Toggle';
import LoginControl from './components/LoginControl';
import List from './components/List';
import InputForm from './components/forms/InputForm';
import ChildrenContainer from './components/forms/ChildrenContainer';
import WaterTemperatureCalculator from './components/forms/WaterTemperatureCalculator'
import FilterableProductTable from './components/search/FilterableProductTable'

function TestFuncComponent(prop){
    return <b>{prop.name}</b>;
}

class TestClassComponent extends Component {
    render() {
        return <i>{this.props.freeFormAttr}</i>;
    }
}

//this products can be provided with API
const PRODUCTS = [
    {category: 'Sporting Goods', price: '$49.99', stocked: true, name: 'Football'},
    {category: 'Sporting Goods', price: '$9.99', stocked: true, name: 'Baseball'},
    {category: 'Sporting Goods', price: '$29.99', stocked: false, name: 'Basketball'},
    {category: 'Electronics', price: '$99.99', stocked: true, name: 'iPod Touch'},
    {category: 'Electronics', price: '$399.99', stocked: false, name: 'iPhone 5'},
    {category: 'Electronics', price: '$199.99', stocked: true, name: 'Nexus 7'}
];

class App extends Component {
  render() {
    return (
      //  JSX
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h2>Welcome to React </h2>
        </div>
        <p className="App-intro">
          To get started, edit <code>src/App.js</code> and save to reload.
        </p>

        <TestFuncComponent name="test: TestFuncComponent-name"/>
        <TestClassComponent freeFormAttr="test: TestClassComponent-freeFormAttr"/>

        <Clock />
        <Toggle />
        <ChildrenContainer>
            <h2>Below there are some forms examples</h2>

            <LoginControl />
            <List elements={[1,2,3,4,5]} />
            <InputForm defaultValue="Hello, world!"/>
            <WaterTemperatureCalculator />
        </ChildrenContainer>

        <FilterableProductTable products={PRODUCTS}/>
      </div>
    );
  }
}

export default App;
