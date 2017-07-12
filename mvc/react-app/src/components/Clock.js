/**
 * Created by dmitry on 06.07.17.
 */
import React from 'react';

class Clock extends React.Component {

    // internal state is saved in state variable
    constructor(props) {
        super(props);
        this.state = {
            date: new Date()
        };
    }

    //this method is executed after Component result is added in DOM
    componentDidMount() {
        //print result every second
        this.timerId = setInterval(
            () => this.tick(),
            1000
        )
    }

    //this method is executed before Component result will be removed
    componentWillMount() {
        clearInterval(this.timerID);
    }

    tick() {
        this.setState({
            date: new Date()
        });
    }

    render() {
        return (
            <div>
                <h1>Hello, world!</h1>
                <h2>It is {this.state.date.toLocaleTimeString()}.</h2>
            </div>
        );
    }
}

export default Clock;