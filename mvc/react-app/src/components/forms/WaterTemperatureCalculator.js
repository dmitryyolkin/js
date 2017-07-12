/**
 * Created by dmitry on 12.07.17.
 */

import React from 'react';

function BoilingVerdict(props) {
    if (props.celsius >= 100) {
        return <p>Water will boil!</p>
    }
    return <p>Water won't boil!</p>
}

const scaleNames = {
    c: 'Celsius',
    f: 'Fahrenheit'
};

function toCelsius(fahrenheit) {
    return (fahrenheit - 32) * 5 / 9;
}

function toFahrenheit(celsius) {
    return (celsius * 9 / 5) + 32;
}

//convert input data to String according to some formula
function tryConvert(value, convert) {
    const input = parseFloat(value);
    if (Number.isNaN(input)) {
        return '';
    }
    const output = convert(input);
    const rounded = Math.round(output * 1000) / 1000;
    return rounded.toString();
}


//Input for temperature of different scales
class TemperatureInput extends React.Component {

    constructor(props) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(e) {
        this.props.onChange(e.target.value);
    }

    render() {
        const scale = this.props.scale;
        const value = this.props.value;

        return (
            <fieldset>
                <legend>Enter temperature in {scaleNames[scale]}:</legend>
                <input value={value}
                       onChange={this.handleChange} />
            </fieldset>
        );
    }
}

//Mian component
class WaterTemperatureCalculator extends React.Component {

    constructor(props) {
        super(props);
        this.handleCelsiusChange = this.handleCelsiusChange.bind(this);
        this.handleFahrenheitChange = this.handleFahrenheitChange.bind(this);
        this.state = {
            scale: 'c',
            value: ''
        }
    }

    handleCelsiusChange(value) {
        this.setState({
            scale: 'c',
            value: value
        });
    }

    handleFahrenheitChange(value) {
        this.setState({
            scale: 'f',
            value: value
        });
    }

    render() {

        const scale = this.state.scale;
        const value = this.state.value;

        const celsius = scale === 'f' ? tryConvert(value, toCelsius) : value;
        const fahrenheit = scale === 'c' ? tryConvert(value, toFahrenheit) : value;

        //Входные данные в TemperatureInput синхронизируются,
        //т. к. их значения вычисляются, исходя из одного и того же состояния
        //т.е. после того как что-то вводится в одном TemperatureInput -> вызывается соответствующий handler ->
        //изменяется состояние и снова вызывается метод render(), который перерисовывает компоненты с учетом новых значений
        return (
            <div>
                <TemperatureInput
                    scale="c"
                    value={celsius}
                    onChange={this.handleCelsiusChange}
                />
                <TemperatureInput
                    scale="f"
                    value={fahrenheit}
                    onChange={this.handleFahrenheitChange}
                />
                <BoilingVerdict celsius={parseFloat(celsius)}/>
            </div>
        )
    }
}


export default WaterTemperatureCalculator;