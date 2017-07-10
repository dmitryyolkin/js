/**
 * Created by dmitry on 07.07.17.
 */
import React from 'react';

class Toggle extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            isToggleOn: false
        };

        //it's needed to be able to use this within handleClick
        //Будьте осторожны с этими значениями в обратных сигналах JSX.
        //Классовые алгоритмы не связаны по умолчанию.
        //Если вы забыли связать их, выполните this.handleClick и передайте его на onClick.
        // This станет undefined когда функция получит сигнал.
        this.handleClick = this.handleClick.bind(this);
    }

    handleClick() {
        this.setState(prevState => ({
            isToggleOn : !prevState.isToggleOn
        }))
    }

    render() {
        return (
            //link to method handler should be done in camelCase
            <button onClick={this.handleClick}>
                {this.state.isToggleOn ? "ON" : "OFF"}
            </button>
        );
    }

}

export default Toggle;