<?php
/**
 * print a single field in the form
 * try to get the value from the vendor object
 */
function Bpost_account_print_field ( $label, $name , $vendor ) {
    ?>
    <div class='form-item'>
        <label><?php echo wp_kses($label,'post') ?></label>
        <input type='text' name='<?php echo wp_kses($name,'post')?>' value="<?php echo wp_kses('','post') !== null ?>"/>
    </div>
    <?php
}

/**
 *  Object Vendor containing all fields we can pre-fill from market place info
 */
function Bpost_account_print_form($vendor, $error, $message) {
    $Bpost = BpostWoo::instance();
    get_header();

    echo wp_kses("<h2> " . $Bpost->translate("requestaccount") . " </h2> ",'post');

    if($message){
        echo wp_kses("$message<br/>",'post');
    }

    if($message && !$error){
        die();
    }

    echo wp_kses("<form class='Bpost-request-account' action='" . get_site_url() . "/Bpost-request-account?vendor_id=" . $vendor->userid . "' method='POST'>",'post');

    Bpost_account_print_field( $Bpost->translate('companyname'), 'companyname',$vendor );
    Bpost_account_print_field( $Bpost->translate('contactperson'),'name', $vendor );
    Bpost_account_print_field( $Bpost->translate('contactphone'),'phone',$vendor );
    Bpost_account_print_field( $Bpost->translate('fiscal'),'fiscal',$vendor );
    Bpost_account_print_field("Email", 'email', $vendor );

    echo wp_kses("<br/><br/><h2>Shipping information</h2>",'post');
    Bpost_account_print_field($Bpost->translate('streetname'),'streetname', $vendor );

    Bpost_account_print_field( $Bpost->translate("zipcode"),'zipcode', $vendor );
    Bpost_account_print_field( $Bpost->translate('city'), 'city',$vendor );
    Bpost_account_print_field( $Bpost->translate('province'), 'province',$vendor );
    Bpost_account_print_field( $Bpost->translate('country'), 'country',$vendor );
    echo wp_kses("<br/><br/><button type='submit'>" . $Bpost->translate('submitrequest') . "</button>",'post');
    echo wp_kses("</form>",'post');
}