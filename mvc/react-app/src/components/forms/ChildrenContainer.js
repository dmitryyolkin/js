/**
 * Created by dmitry on 13.07.17.
 */
import React from 'react';

class ChildrenContainer extends React.Component {

    render () {
        //all elements specified within ChildrenContainer can be accessible through
        //this.props.children
        return (
            <div>
                {this.props.children}
            </div>
        )
    }
}

export default ChildrenContainer;
