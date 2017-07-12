/**
 * Created by dmitry on 07.07.17.
 */
import React from 'react';

class LoginControl extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            isLoggedIn: false
        };
        this.handleLoginClick = this.handleLoginClick.bind(this);
        this.handleLogoutClick = this.handleLogoutClick.bind(this);
    }

    handleLoginClick() {
        this.setState(() => ({
            isLoggedIn: true
        }));
    }

    handleLogoutClick() {
        this.setState(() => ({
            isLoggedIn: false
        }));
    }

    render() {
        //пример условного рендеринга
        const loggedIn = this.state.isLoggedIn;

        var button;
        if (loggedIn) {
            button = <LogoutButton onClick={this.handleLogoutClick}/>;
        } else {
            button = <LoginButton onClick={this.handleLoginClick}/>;
        }

        return (
            <div>
                <Greeting isLoggedIn={loggedIn}/>
                {button}
            </div>
        );
    }
}

function UserGreeting(props) {
    return <div>Welcome back!</div>;
}

function GuestGreeting(props) {
    return <div>Please sign up!</div>;
}

function Greeting(props) {
    const loggedIn = props.isLoggedIn;
    return loggedIn ? <UserGreeting /> : <GuestGreeting />;
}


function LoginButton(props) {
    return (
        //pass handler function to props
        <button onClick={props.onClick}>Login</button>
    )
}

function LogoutButton(props) {
    return (
        //pass handler function to props
        <button onClick={props.onClick}>Logout</button>
    )
}

export default LoginControl;