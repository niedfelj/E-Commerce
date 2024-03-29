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

define(["backbone", "factory"], function(Backbone) {
    'use strict';

    App.Views.CoreTipsView = {};

    App.Views.CoreTipsView.CoreTipsMainView = App.Views.FactoryView.extend({
        name: 'tips',
        mod: 'main',
        render: function() {
            var self = this,
                model = this.model.toJSON();
            model.currency_symbol = App.Data.settings.get('settings_system').currency_symbol;
            model.isFirefox = /firefox/i.test(navigator.userAgent);
            model.tip_allow = App.Data.settings.get('settings_system').accept_tips_online === true;

            this.$el.html(this.template(model));
            inputTypeNumberMask(this.$('.tipAmount'), /^\d{0,5}\.{0,1}\d{0,2}$/, '0.00');

            // execute after render
            setTimeout(function() {
                var type = self.model.get('type') ? 1 : 0,
                    amount = self.model.get('amount'),
                    percent = self.model.get('percent'),
                    sum = self.model.get('sum');

                self.$('input[name="tips"][value="' + type + '"]').change();
                if(type)
                    if(amount && percent)
                        self.$('.btn[data-amount="' + percent + '"]').click();
                    else if(!amount) {
                        self.$('.btn[data-amount="other"]').click();
                        self.$('.tipAmount').val(sum || '0.00');
                    }
            }, 0);

            this.listenSum = setInterval(this.setSum.bind(this), 200);

            return this;
        },
        remove: function() {
            clearInterval(this.listenSum);
            return App.Views.FactoryView.prototype.remove.apply(this, arguments);
        },
        events: {
            'change input[name="tips"]': 'setType',
            'click .btn': 'setAmount',
            'change .tipAmount': 'setSum'
        },
        setType: function(e) {
            var val = Boolean(parseInt(e.target.value, 10));

            this.$('.tipAmount').attr('disabled', 'disabled');
            this.$('input[name="tips"]').removeAttr('checked');
            this.$(e.target).attr('checked', 'checked');

            this.model.set('type', val);

            if(!val) {
                this.$('.btn').removeClass('selected');
                this.$('.btn').addClass('disabled');
            } else {
                this.$('.btn').removeClass('disabled');
            }

            this.$('[type="radio"]').next('.radio').removeClass('checked');
            this.$(e.target).next('.radio').addClass('checked');
        },
        setAmount: function(e) {
            if(this.$(e.target).hasClass('disabled'))
                return;

            var amount = $(e.target).attr('data-amount') * 1;

            this.$('.btn').removeClass('selected');
            this.$(e.target).addClass('selected');

            this.model.set('amount', isNaN(amount) ? false : true);

            if(amount) {
                this.$('.tipAmount').attr('disabled', 'disabled');
                this.model.set('percent', amount);
            } else {
                this.$('.tipAmount').removeAttr('disabled');
            }
        },
        setSum: function() {
            var amount = this.$('.tipAmount');

            if(amount.attr('disabled') === 'disabled') {
                amount.val(round_monetary_currency(App.Data.myorder.total.get_tip()));
            } else {
                this.model.set('sum', amount.val());
            }

        }
    });

    App.Views.TipsView = {};

    App.Views.TipsView.TipsMainView = App.Views.CoreTipsView.CoreTipsMainView;
});