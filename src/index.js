import React from 'react';
import ReactDOM from 'react-dom';
import './styles/index.css';
import App from './components/App';
import * as serviceWorker from './serviceWorker';

import { ApolloProvider } from 'react-apollo';
import { ApolloClient } from 'apollo-client';
import { createHttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';

import { BrowserRouter } from 'react-router-dom';
import { setContext } from '../node_modules/apollo-link-context'; // middleware invoked every time ApolloClient sends req to server
import { AUTH_TOKEN } from './constants';

import { split } from 'apollo-link';
import { WebSocketLink } from 'apollo-link-ws';
import { getMainDefinition } from 'apollo-utilities';

// instantiate + authenticate websocket conn
const wsLink = new WebSocketLink({
    uri: "ws://localhost:4000",
    options: {
        reconnect: true,
        connectionParams: {
            authToken: localStorage.getItem(AUTH_TOKEN)
        }
    }
});

const httpLink = createHttpLink({
    uri: 'http://localhost:4000'
});

const authLink = setContext((_, {headers}) => {
    const token = localStorage.getItem(AUTH_TOKEN);
    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : ""
        }
    };
});

// split: to "route" request to specific middleware link based on a test
const link = split (
    ({query}) => {
        const {kind, operation} = getMainDefinition(query);
        // test
        return kind === "OperationDefinition" && operation === "subscription";
    },
    wsLink, // route here if test is true (subscription)
    authLink.concat(httpLink) // route here if test is false (query or mutation)
);

const client = new ApolloClient({
    link,
    cache: new InMemoryCache()
});

ReactDOM.render(
    <BrowserRouter>
        <ApolloProvider client={client}>
        <App />
        </ApolloProvider>
    </BrowserRouter>,
    document.getElementById('root')
)

serviceWorker.unregister();
