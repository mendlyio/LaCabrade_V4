jQuery(document).ready(function () {
    jQuery('input[type="text"]').on('change', function() {
        if (jQuery('input[name="Bpost_public_key"]').val() === '' && jQuery('input[name="Bpost_private_key"]').val() === ''){

            console.log("Caoooo");
            // Create the new div with jQuery
            var newDiv2 =  jQuery(
                '<div style="width: 616px;margin: 18px auto;">' +
                '<h3>How to obtain your keys?</h3>' +
                '<p style="text-decoration: underline;font-weight: bold;">You already have your bpost contract?</p>' +
                '<p style="display: inline;">Nothing more simple, just connect your bpost account via </p>' +
                '<a style="display: inline;" target="_blank" href="https://plugins.bpost.be">this link</a><p style="display: inline;"> to add new keys to your account</p><br>' +
                '<p style="text-decoration: underline;font-weight: bold;">You are not yet bpost customer?</p>' +
                '<a style="display: inline;" target="_blank" href="https://www.bpost.be/plugin_installation_offers_en">Discover our offer</a><br>' +
                '<h3>More information?</h3>'+
                '<a style="display: inline;" target="_blank" href="https://plugins.bpost.be/files/plugindownload/WooCommerce/Quickguide_woocommerce_en.pdf">Download the tutorial</a><br>' +
                '</div>'
            );

            jQuery("#content_text").replaceWith(newDiv2);
            jQuery("#tokenTitle").remove();
            jQuery("#tokenExpires").remove();
            jQuery("#newToken").remove();



            // Append the new div to the placeholder
            // jQuery('#content_text').innerHTML = newDiv2;

            // Adjust the height of the body to ensure it takes at least 100% height of the viewport
            jQuery('body').css('height', 'auto');

        }
    });
})