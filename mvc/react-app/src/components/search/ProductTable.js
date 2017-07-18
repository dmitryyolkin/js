/**
 * Created by dmitry on 17.07.17.
 */
import React from 'react';
import ProductCategoryRow from './ProductCategoryRow';
import ProductRow from './ProductRow';

class ProductTable extends React.Component {

    render() {
        var rows = [];
        var lastCategory = null;

        const filterText = this.props.filterText;
        const inStockOnly = this.props.inStockOnly;
        this.props.products.forEach(function(product){
            if (product.name.indexOf(filterText) === -1 || (!product.stocked && inStockOnly)) {
                return;
            }

            if (product.category !== lastCategory) {
                rows.push(<ProductCategoryRow category={product.category} key={product.category} />);
            }
            rows.push(<ProductRow product={product} key={product.name} />);
            lastCategory = product.category;
        });

        return (
            <table>
                <thead>
                <tr>
                    <th>Name</th>
                    <th>Price</th>
                </tr>
                </thead>
                <tbody>{rows}</tbody>
            </table>
        )
    }
}

export default ProductTable;
