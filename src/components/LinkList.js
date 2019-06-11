import React, { Component } from 'react';
import Link from './Link';
import { Query } from 'react-apollo';
import gql from 'graphql-tag';

export const FEED_QUERY = gql`
  {
    feed {
      links {
        id
        createdAt
        url
        description
        postedBy {
          id
          name
        }
        votes {
          id
          user {
            id
          }
        }
      }
    }
  }
`;

const NEW_LINKS_SUBSCRIPTION = gql`
  subscription {
    newLink {
      id
      url
      description
      createdAt
      postedBy {
        id
        name
      }
      votes {
        id
        user {
          id
        }
      }
    }
  }
`;

const NEW_VOTES_SUBSCRIPTION = gql`
  subscription {
    newVote {
      id
      link {
        id
        url
        description
        createdAt
        postedBy {
          id
          name
        }
        votes {
          id
          user {
            id
          }
        }
      }
      user {
        id
      }
    }
  }
`;

class LinkList extends Component { 

  _updateCacheAfterVote = (store, createVote, linkId) => {
    // read curr state of cached data 
    const data = store.readQuery({query: FEED_QUERY});
    // retrieve link user just voted for from ^
    const votedLink = data.feed.inks.find(link => link.id ===linkId);
    votedLink.votes = createVote.link.votes;
    // write modified data back to store
    store.writeQuery({query: FEED_QUERY, data});
  }

  _subscribeToNewLinks = subscribeToMore => {
    subscribeToMore({

      // reps subscription query (fires every time new link is created)
      document: NEW_LINKS_SUBSCRIPTION,

      
      // determines how store should be updated w/ info sent by server after event
      // retrieve new link from received sub data, merge into existing set of links, return result of this op
      updateQuery: (prev, { subscriptionData }) => {
        if (!subscriptionData.data) return prev;

        const newLink = subscriptionData.data.newLink;
        const exists = prev.feed.links.find(({ id }) => id === newLink.id);

        if (exists) return prev;
  
        return Object.assign({}, prev, {
          feed: {
            links: [newLink, ...prev.feed.links],
            count: prev.feed.links.length + 1,
            __typename: prev.feed.__typename
          }
        });
      }
    })
  }

  _subscribeToNewVotes = (subscribeToMore) => {
    subscribeToMore({
      document: NEW_VOTES_SUBSCRIPTION
    })
  }

  render() {
      return (
          <Query query={FEED_QUERY}>
              {({ loading, error, data, subscribeToMore }) => {
                  if (loading) return <div> ... Fetching ...</div>
                  if (error) return <div>Error!</div>

                  // subscribe to new events (via websock conn to subscription server)
                  this._subscribeToNewLinks(subscribeToMore)
                  this._subscribeToNewVotes(subscribeToMore)

                  const linksToRender = data.feed.links
              
                  return (
                    <div>
                      {linksToRender.map((link, index) => (
                        <Link 
                          key={link.id} 
                          link={link} 
                          index={index} 
                          updateStoreAfterVote={this._updateCacheAfterVote}
                        />
                      ))}
                    </div>
                  );
              }}
          </Query>
      );
  }
}

export default LinkList;