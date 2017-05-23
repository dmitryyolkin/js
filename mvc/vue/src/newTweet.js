/**
 * Created by dmitry on 23.05.17.
 */
'use strict';

new Vue({
    el: '#twitterVue',
    data: {
        tweet: ''
    },
    computed: {
        tweetIsEmpty: function() {
            return this.tweet.length == 0;
        }
    }
});
