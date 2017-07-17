/**
 * Created by dmitry on 17.07.17.
 */
import React from 'react';
import SearchBar from './SearchBar';
import ProductTable from './ProductTable';


class FilterableProductTable extends React.Component {
    render() {
        return (
            <div>
                <SearchBar />
                <ProductTable products={this.props.products}/>
            </div>
        )
    }
}

export default FilterableProductTable;