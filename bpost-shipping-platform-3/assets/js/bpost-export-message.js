var Bpost_label_label = BpostData.Bpost_label_label;
var Bpost_label_click = BpostData.Bpost_label_click;
var Bpost_label_request = BpostData.Bpost_label_request;
jQuery(function(){
    let eHeader = jQuery("body.post-type-shop_order .wrap h1");

    if (BpostData.is_single_order) {
        eHeader.append('<a href="#!" onclick="Bpost.printlabel(event,' + BpostData.post_id + ')" class="page-title-action Bpost-btn-print-label">' + BpostData.Bpost_label_label + '</a>');
    }

    if (BpostData.export_message !== '') {
        var eBpost = jQuery(BpostData.export_message);
        jQuery(".wp-header-end").before(eBpost);
        Bpost.exportSuccess(BpostData.login_url);
        console.log(eBpost.get(0));
    }


});
