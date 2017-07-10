/**
 * Created by dmitry on 10.07.17.
 */
import React from 'react';

class List extends React.Component {

    render() {
        const intArr = this.props.elements;
        const doubledArr = intArr.map(
            //Ключи помогают React определить, какие элементы были изменены, добавлены или удалены.
            //Элементы внутри массива (внутри функции map) должны быть обеспечены ключами, чтобы иметь стабильную идентичность
            n => <li key={n.toString()}>{n * 2}</li>
        );
        return (
            <ul>{doubledArr}</ul>
        );
    }
}

export default List;
