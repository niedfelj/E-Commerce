/*
 * Revel Systems Online Ordering Application
 *
 *  Copyright (C) 2014 by Revel Systems
 *
 * This file is part of Revel Systems Online Ordering open source application.
 *
 * Revel Systems Online Ordering open source application is free software: you
 * can redistribute it and/or modify it under the terms of the GNU General
 * Public License as published by the Free Software Foundation, either
 * version 3 of the License, or (at your option) any later version.
 *
 * Revel Systems Online Ordering open source application is distributed in the
 * hope that it will be useful, but WITHOUT ANY WARRANTY; without even the
 * implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Revel Systems Online Ordering Application.
 * If not, see <http://www.gnu.org/licenses/>.
 */

define(['products'], function() {
    'use strict';

    App.Models.Search = Backbone.Model.extend({
        defaults: {
            pattern: null,
            products: null
        },
        get_products: function() {
            var self = this,
                load = $.Deferred(),
                pattern = this.get('pattern'),
                results = new App.Collections.Products;

            results.onProductsError = function() {
                App.Data.errors.alert(MSG.PRODUCTS_EMPTY_RESULT);
                load.resolve();
            }

            results.get_products(undefined, pattern).then(function() {
                self.set({products: results});
                load.resolve();
            });

            return load;
        }
    });

    App.Collections.Search = Backbone.Collection.extend({
        model: App.Models.Search,
        search: function(pattern) {
            var cache = this.where({pattern: pattern});
            this.trigger('onSearchStart', search);
            if(cache.length > 0)
                return this.trigger('onSearchComplete', cache[0]);

            var search = new App.Models.Search({pattern: pattern}),
                self = this;

            this.add(search);
            search.get_products().then(function() {
                self.trigger('onSearchComplete', search);
            });
        }
    });
});