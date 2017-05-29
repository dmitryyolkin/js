/**
 * Created by dmitry on 23.05.17.
 */
'use strict';

const MAX_TWEET_LENGTH = 140;

new Vue({
    el: '#twitterVue',
    data: {
        //this tweet value is specified with v-model attribute specified for an element
        tweet: '',
        photos: []
    },
    //this is computed properties that can be refered from html code
    computed: {
        tweetIsOutOfRange: function() {
            return this.charactersRemaining == MAX_TWEET_LENGTH || this.charactersRemaining < 0;
        },
        charactersRemaining: function() {
            return MAX_TWEET_LENGTH - this.tweet.length;
        },
        underTwentyMark: function() {
            return this.charactersRemaining <= 20 && this.charactersRemaining > 10;
        },
        underTenMark: function() {
            return this.charactersRemaining <= 10;
        },
        photoHasBeenUploaded: function() {
            return this.photos.length > 0;
        }
    },

    //this 'methods' block contains all event handlers and methods that don't require two-binding model
    methods: {
        triggerFileUpload: function() {
            //It is notoriously difficult to style HTML5 file inputs.
            //One workaround involves putting an input in the DOM and hiding it with CSS.
            //In order for the browser to open the native file picker, this input must be clicked.
            //How it gets clicked, and how the client handles what the user uploads,
            //though, is a different matter.
            this.$refs.photoUpload.click();
        },
        handlePhotoUpload: function(e) {
            var self = this;
            var files = e.target.files;
            for(let i = 0; i < files.length; i++) {
                let reader = new FileReader();
                reader.onloadend = function (evt) {
                    self.photos.push(evt.target.result);
                };
                reader.readAsDataURL(files[i]);
            }
        },
        removePhoto: function(index) {
            console.log('photo N' + index + ' is removed');
            this.photos.splice(index, 1);
        }
    }
});
