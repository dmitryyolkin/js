/**
 * Created by dmitry on 23.05.17.
 */
'use strict';

const MAX_TWEET_LENGTH = 140;

new Vue({
    el: '#twitterVue',
    data: {
        //this tweet value is specified with v-model attribute specified for an element
        tweet: ''
    },
    computed: {
        tweetIsOutOfRange: function() {
            return this.charactersRemaining == MAX_TWEET_LENGTH || this.charactersRemaining < 0;
        },
        charactersRemaining: function() {
            return MAX_TWEET_LENGTH - this.tweet.length;
        }
    }
});
