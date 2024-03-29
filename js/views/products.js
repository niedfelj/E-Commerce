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

define(["backbone", "factory", "generator", "list"], function(Backbone) {
    'use strict';

    App.Views.CoreProductView = {};

    App.Views.CoreProductView.CoreProductListItemView = App.Views.ItemView.extend({
        name: 'product',
        mod: 'list_item',
        initialize: function() {
            App.Views.ItemView.prototype.initialize.apply(this, arguments);
            this.listenTo(this.model, 'change:active', this.show_hide);
            this.show_hide();
        },
        render: function() {
            var model = this.model.toJSON();
            model.hide_images = App.Data.settings.get('settings_system').hide_images;
            model.currency_symbol = App.Data.settings.get('settings_system').currency_symbol;
            model.price = round_monetary_currency(model.price);
            model.price_length = model.price.length + model.currency_symbol.length;
            model.show_product_description = !App.Data.settings.get('settings_system').hide_products_description;
            model.uom = App.Data.settings.get("settings_system").scales.default_weighing_unit;
            model.isDefaultImage = model.image == App.Data.settings.get_img_default();
            this.$el.html(this.template(model));
            this.afterRender.call(this, model.sort);
            return this;
        },
        events: {
            "click": "showModifiers"
        },
        showModifiers: function(e) {
            e.preventDefault();
            var id_category = this.model.get('id_category'),
                id = this.model.get('id');
            App.Data.router.navigate("modifiers/" + id_category + "/" + id, true);
        },
        show_hide: function() {
            if (!this.model.get('active')) {
                this.$el.addClass('hide');
            } else {
                this.$el.removeClass('hide');
            }
        }
    });

    App.Views.CoreProductView.CoreProductListView = App.Views.ListView.extend({
        name: 'product',
        mod: 'list',
        initialize: function() {
            App.Views.ListView.prototype.initialize.apply(this, arguments);
            this.listenTo(this.collection, 'add', this.addItem, this);
        },
        render: function() {
            var self = this;
            App.Views.ListView.prototype.render.apply(this, arguments);
            this.collection.each( function(item) {
                self.addItem(item);
            });
            return this;
        },
        addItem: function(model) {
            if (model.get("attribute_type") == 2) { // to hide child products
                return;
            }
            var settings = App.Data.settings.get('settings_system'),
                noImg = settings.hide_images,
                noDesc = settings.hide_products_description,
                view;
            view = App.Views.GeneratorView.create('Product', {
                el: $('<li class="product"></li>'),
                mod: 'ListItem',
                model: model
            }, 'product_' + model.cid);
            noDesc && view.$el.addClass('short');
            noImg && view.$el.addClass('no-image');
            App.Views.ListView.prototype.addItem.call(this, view, this.$('.products'), model.escape('sort'));
            this.subViews.push(view);
            $(window).resize();
        }
    });

    App.Views.CoreProductView.CoreProductModifiersView = App.Views.FactoryView.extend({
        name: 'product',
        mod: 'modifiers',
        initialize: function() {
            this.product = this.model.get_product();
            this.modifiers = this.model.get_modifiers();
            App.Views.FactoryView.prototype.initialize.apply(this, arguments);
            this.listenTo(this.model, 'change:initial_price', this.update_price, this);
        },
        events: {
            'change .gift_card_number': 'gift_change',
            'change .gift_card_price': 'gift_price_change'
        },
        render: function() {
            var model = this.product.toJSON(),
                settings = App.Data.settings;

            model.hide_images = settings.get('settings_system').hide_images;
            model.currency_symbol = settings.get('settings_system').currency_symbol;
            model.price = round_monetary_currency(this.model.get('initial_price'));
            model.price_length = model.price.length;
            model.not_size = this.modifiers && this.modifiers.getSizeModel() === undefined;
            model.uom = App.Data.settings.get("settings_system").scales.default_weighing_unit;
            model.images = Array.isArray(model.images) ? model.images : [];

            if (App.skin == App.Skins.RETAIL && model.images[0] == settings.get_img_default()) {
                model.images[0] = settings.get_img_default(2); //to load noneMatrix.png
            }

            this.gift_price = model.is_gift && model.not_size;

            this.$el.html(this.template(model));

            if (model.is_gift) {
                inputTypeNumberMask(this.$('.gift_card_number'), /^(\d|-){0,255}$/, '');
            }
            if (this.gift_price) {
                inputTypeNumberMask(this.$('.gift_card_price'), /^\d{0,3}(\.\d{0,2})?$/, '');
            }

            if (App.skin == App.Skins.RETAIL)
                this.$('.img').attr('data-default-index', 2);
            loadSpinner(this.$('.img'));

            return this;
        },
        gift_change: function(e) {
           this.product.set('gift_card_number', e.currentTarget.value);
        },
        gift_price_change: function(e) {
           this.model.set('initial_price', e.currentTarget.value * 1);
           this.product.set('price', e.currentTarget.value * 1);
        },
        update_price: function() {
            var dt = this.$('dt'),
                initial_price = round_monetary_currency(this.model.get('initial_price'));

            if (dt.length) {
                dt.prop('className', dt.prop('className').replace(/(\s+)?s\d+(?=\s|$)/, ''));
                dt.addClass('s' + initial_price.length);
            }

            if (this.gift_price) {
                this.$('.price').val(initial_price);
            } else {
                this.$('.price').text(initial_price);
            }
        }
    });


    App.Views.ProductView = {};

    App.Views.ProductView.ProductListItemView = App.Views.CoreProductView.CoreProductListItemView;

    App.Views.ProductView.ProductListView = App.Views.CoreProductView.CoreProductListView;

    App.Views.ProductView.ProductModifiersView = App.Views.CoreProductView.CoreProductModifiersView;

});