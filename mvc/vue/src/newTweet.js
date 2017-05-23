/**
 * Created by dmitry on 23.05.17.
 */
'use strict';

new Vue({
    el: '#twitterVue',
    data: {
        //this tweet value is specified with v-model attribute specified for an element
        tweet: ''
    },
    computed: {
        tweetIsEmpty: function() {
            return this.tweet.length == 0;
        }
    }
});
