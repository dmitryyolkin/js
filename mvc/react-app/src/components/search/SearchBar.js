/**
 * Created by dmitry on 17.07.17.
 */
import React from 'react';

class SearchBar extends React.Component {

    constructor(props) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange() {
        //we pass parent 'onUserInput' function through props
        //Please pay attention we invoke here 'onUserInput' because it's props name
        //instead of handleUserInput specified as handler in parent FilterableProductTable.js
        this.props.onUserInput(
            this.filterTextInput.value,
            this.inStockOnlyInput.checked
        );
    }

    render() {
        return (
            <form>
                <input
                    type="text"
                    placeholder="Search.."
                    value={this.props.filterValue}
                    ref={(input) => this.filterTextInput = input}
                    onChange={this.handleChange}/>
                <p>
                    <input
                        type="checkbox"
                        checked={this.props.inStockOnly}
                        ref={(input) => this.inStockOnlyInput = input}
                        onChange={this.handleChange}/>
                    {' '}
                    Only show products in stock
                </p>
            </form>
        );
    }
}

export default SearchBar;