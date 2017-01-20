/**
 * Created by dmitry on 30.12.16.
 */
'use strict';

var Marionette = require('marionette');
var AdminEditorTemplate = require("hbs!templates/admin/adminEditor");

module.exports = Marionette.View.extend({
    template: AdminEditorTemplate,

    initialize: function(options){
        _.extend(this, options);
    },

    onRender: function(){
        console.log("AdminEditor onRender");
    },

    //it's required to show data in hbs template
    serializeData: function () {
        var user = this.model;
        return {
            id: user.get('_id'),
            name: user.get('name'),
            surname: user.get('surname'),
            email: user.get('email'),
            login: user.get('login'),
            roles: user.get('roles'),
            animals: user.get('animals').map(function(animal){
                return animal.name;
            })
        };
    }

});

