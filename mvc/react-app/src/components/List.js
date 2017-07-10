/**
 * Created by dmitry on 10.07.17.
 */
import React from 'react';

class List extends React.Component {

    render() {
        const intArr = this.props.elements;
        const doubledArr = intArr.map(n => <li>{n * 2}</li>);
        return (
            <ul>{doubledArr}</ul>
        );
    }
}

export default List;
