/**
 * Created by dmitry on 11.07.17.
 */
import React from 'react';

class InputForm extends React.Component {

    constructor(props) {
        super(props);

        //контролируемые компоненты имеют св-во value
        //которое позволяет отображать необходимое значение
        this.state = {
            value: ''
        };
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleChange(event){
        this.setState({
            value: event.target.value
        })
    }

    handleSubmit(event){
        alert('Text field value is:' + this.state.value);
    }

    render() {
        return (
            <div>
                <input
                    type="text"
                    placeholder={this.props.defaultValue}
                    value={this.state.value}
                    onChange={this.handleChange}/>
                <button onClick={this.handleSubmit}>
                    Submit
                </button>
            </div>
        );
    }

}

export default InputForm;