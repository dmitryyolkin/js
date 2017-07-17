/**
 * Created by dmitry on 17.07.17.
 */
import React from 'react';

class SearchBar extends React.Component {
    render() {
        return (
            <form>
                <input type="text" placeholder="Search.."/>
                <p>
                    <input type="checkbox"/>
                    {' '}
                    Only show products in stock
                </p>
            </form>
        );
    }
}

export default SearchBar;