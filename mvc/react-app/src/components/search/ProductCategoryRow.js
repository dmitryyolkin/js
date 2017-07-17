/**
 * Created by dmitry on 17.07.17.
 */
import React from 'react';

class ProductCategoryRow extends React.Component {
    render () {
        return (
            <tr><th colSpan="2">{this.props.category}</th></tr>
        );
    }
}

export default ProductCategoryRow;
