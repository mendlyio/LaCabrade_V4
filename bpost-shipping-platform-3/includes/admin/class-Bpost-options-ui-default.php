<?php
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly
include_once (BPOST_PLUGIN_PATH.'/includes/admin/class-Bpost-options-ui.php');
class BpostOptionsUIDefault extends BpostOptionsUI {

    public function getTextInput($label,$name,$value)
    {
        return  '<div class="bpost-input-title">' . $label . '</div>'
            . '<input type="text" class="bpost-input" name="' . $name . '" value="' . $value  . '"/>';
    }

    public function print_bpost_options()
    {
        print '<div id="bpost-settings">';
        $this->print_banner();
        $this->print_tabs();
        $this->print_settings_tab();
        $this->print_help_tab();
        print '</div>';
    }



    public function print_banner()
    {
        global $Bpost;

        echo wp_kses(
            '<div id="bpost-banner">
        <div class="bpost-banner--inner">
            <img src="' . esc_url(BPOST_PLUGIN_URL . '/assets/images/logo.svg') . '"/>
            <span>' . esc_html($Bpost->translate('new_account')) . ' <a href="' . esc_url(BPOST_CREATE_ACCOUNT) . '" target="_blank">' . esc_html($Bpost->translate("Click Here")) . '</a></span>
        </div>
    </div>',
            array(
                'div' => array(
                    'id' => array(),
                    'class' => array(),
                ),
                'img' => array(
                    'src' => array(),
                ),
                'span' => array(),
                'a' => array(
                    'href' => array(),
                    'target' => array(),
                )
            )
        );
    }

    public function print_tabs()
    {
        global $Bpost;


        echo wp_kses(
            '<div class="bpost-tabs">
        <span class="bpost-tabs--tab nav-tab nav-tab-active" onclick="Bpost.platform.selectTab(0)">
            ' . esc_html($Bpost->translate('settings')) . '
        </span>
        <span class="bpost-tabs--tab nav-tab" onclick="Bpost.platform.selectTab(1)">
            ' . esc_html($Bpost->translate('help')) . '
        </span>
    </div>',
            array(
                'div' => array(
                    'class' => array(),
                ),
                'span' => array(
                    'class' => array(),
                    'onclick' => array(),
                ),
            )
        );

    }

    public function print_settings_tab() {
        echo '<div class="bpost-tab tab active">';
        $this->print_credentials();
        submit_button();
        echo '</div>';
    }

    public function print_accordion($title, $content, $open)
    {
        echo '<div class="bpost-accordion ' . ($open ? 'open' : '') . '">';
        echo '<div class="bpost-accordion--title" onclick="Bpost.platform.accordion(this)">' . wp_kses_data($title) . '<span class="bpost-accordion--icon-close"></span></div>';
//        echo '<div class="bpost-accordion--inner">' . $content . '</div>';
        $allowed_html = array(
            'a' => array(
                'href' => array(),
                'title' => array(),
                'target' => array(),
                'class' => array(),
                'rel' => array(),
                'style' => [],
            ),
            'p' => array(
                'class' => array(),
                'style' => array(),
            ),
            'div' => array(
                'class' => array(),
                'id' => array(),
                'style' => array(),
            ),
            'span' => array(
                'class' => array(),
                'id' => array(),
                'style' => array(),
            ),
            'ul' => array(
                'class' => array(),
                'style' => array(),
            ),
            'ol' => array(
                'class' => array(),
                'style' => array(),
            ),
            'li' => array(
                'class' => array(),
                'style' => array(),
            ),
            'h1' => array(),
            'h2' => array(),
            'h3' => array(),
            'h4' => array(),
            'h5' => array(),
            'h6' => array(),
            'strong' => array(),
            'em' => array(),
            'br' => array(),
            'img' => array(
                'src' => array(),
                'alt' => array(),
                'class' => array(),
                'width' => array(),
                'height' => array(),
            ),
            'small' => array(),
            'input' => array(
                'type' => [],
                'class' => [],
                'name' => [],
                'value' => []
            ),
            'iframe' => array(
                'src' => array(),
                'width' => array(),
                'height' => array(),
                'frameborder' => array(),
                'allowfullscreen' => array(),
            ),
        );
//
        echo '<div class="bpost-accordion--inner">' . wp_kses($content, $allowed_html) . '</div>';

        echo '</div>';
    }

    public function print_credentials()
    {
        global $Bpost;

        $content = $this->getTextInput(esc_html($Bpost->translate('Public Key')), 'Bpost_public_key', esc_attr($this->obfuscate($this->public_key)));
        $content .= $this->getTextInput(esc_html($Bpost->translate('Private Key')), 'Bpost_private_key', esc_attr($this->obfuscate($this->private_key)));

        if (strlen($this->token)) {
            // Escaping the token information and relevant translations
            $content .= '<div id="tokenTitle" class="bpost-input-title">' . esc_html__('Token', 'bpost-shipping-platform') . '</div>';
            $content .= '<div id="tokenExpires" class="bpost-flex-space-between">' . esc_html($this->token) . '<span><label class="bpost-label">' . esc_html($Bpost->translate('expires at')) . ':</label> ' . esc_html($this->token_expires) . '</span></div>';
            $content .= '<p id="newToken"><small>' . $Bpost->translate('A new token will be automatically requested when this one expires') . '</small></p>';

            // Content with carriers
            $content .= '<div id="content_text">';
            $content .= '<div id="carriers" class="bpost-input-title">' . esc_html($Bpost->translate('Carriers Available In your contract')) . '</div>';
            $content .= '<div id="carrierlist">';

            if ($this->carriers) {
                $i = 0;
                foreach ($this->carriers as $carrier) {
                    $content .= ($i++ ? ', ' : '') . esc_html($carrier->Name) . ($carrier->HasPickup ? ' - ' . esc_html($Bpost->translate('Has Pickup')) : '');
                }

                // Escaping the link and surrounding text for shipping zones
                $content .= '<p><small>' . esc_html($Bpost->__('You can add them to')) . ' <a href="' . esc_url(admin_url('admin.php?page=wc-settings&tab=shipping')) . '" target="_blank">' . esc_html($Bpost->translate('shipping zones')) . '</a> ' . esc_html($Bpost->translate('Don\'t forget to set the appropriate cost for each carrier if you don\'t have free shipping for all orders')) . '</small></p>';
            }
            $content .= '</div>';

            // Additional information with external links and descriptions
            $content .= '<div><h3>' . $Bpost->__('Manage shipping rules, international shipments and more') . '</h3><p style="display: inline;">' . $Bpost->__('You wish to fine-tune your shipments by defining rules to select the adequate bpost product or add extra options? You wish to complete default values for international shipments to comply with customs documents?') . '</p><br><p style="display: inline;">' . $Bpost->__('Take a tour in the') . '</p> <a style="display: inline;" target="_blank" href="' . esc_url('https://plugins.bpost.be') . '">' . $Bpost->__('plug-ins') . '</a><p style="display:inline;">' . $Bpost->__('platform of bpost') . '</p><br><h3>' . $Bpost->__('More information?') . '</h3><a style="display: inline;" target="_blank" href="' . esc_url($Bpost->__('Tutorial1link')) . '">' . $Bpost->__('Download the tutorial1') . '</a><br>
                <a style="display: inline;" target="_blank" href="' . esc_url($Bpost->__('Tutorial2Link')) . '">' . $Bpost->__('Download the tutorial2') . '</a><br>
            </div>';
            $content .= '</div>';
        } else {
            // Escaping information when the token is not present
            $content .= '<div id="content_text">';
            $content .= '<div style="width: 616px;margin: 18px auto;">
        <h3>' . $Bpost->__('How to obtain your keys?') . '</h3>
        <p style="text-decoration: underline;font-weight: bold;">' . $Bpost->__('You already have your bpost contract?') . '</p>
        <p style="display: inline;">' . $Bpost->__('Nothing more simple, just connect your bpost account via ') . '</p>
        <a style="display: inline;" target="_blank" href="' . esc_url('https://plugins.bpost.be') . '">' . $Bpost->__('this link') . '</a> 
        <p style="display: inline;">' . $Bpost->__('to add new keys to your account') . '</p><br>
        <p style="text-decoration: underline;font-weight: bold;">' . $Bpost->__('You are not yet a bpost customer?') . '</p>
        <a style="display: inline;" target="_blank" href="' . esc_url('https://www.bpost.be/plugin_installation_offers_en') . '">' . $Bpost->__('Discover our offer') . '</a><br>
        <h3>' . $Bpost->__('More information?') . '</h3>
        <a style="display: inline;" target="_blank" href="' . esc_url('https://plugins.bpost.be/files/plugindownload/WooCommerce/Quickguide_woocommerce_en.pdf') . '">' . $Bpost->__('Download the tutorial') . '</a><br>
    </div>';
            $content .= '</div>';
        }

// Print accordion with escaped content
        $this->print_accordion(esc_html($Bpost->translate('Credentials')), $content, true);

    }

    public function print_help_tab()
    {
        print wp_kses('<div class="bpost-tab tab">','post');
//        $this->print_help_export();
        $this->print_help_status();
        $this->print_help_labels();
        $this->print_help_labels_bulk();
        $this->print_help_wpapi();
        print wp_kses('</div>','post');
    }

    public function print_help_export()
    {
        global $Bpost;

//        $content = $Bpost->translate('exportdescription');

//        $this->print_accordion($Bpost->translate('helpexporttitle'), $content, true);
    }

    public function print_help_status()
    {
        global $Bpost;

        $content = '<p>' . $Bpost->translate('statusdescription') . '</p>';
        $content .= '<span class="bpost-status-list"><label class="bpost-label">' . $Bpost->translate('order') . '</label><ul>';
        $content .= '<li><span class="Bpost-icon Bpost-icon-not-exported"></span>' . $Bpost->translate('notexporteddescription') . '</li>';
        $content .= '<li><span class="Bpost-icon Bpost-icon-success"></span>' . $Bpost->translate('successdescription') . '</li>';
        $content .= '<li><span class="Bpost-icon Bpost-icon-error"></span>' . $Bpost->translate('exporterrordescription') . '</li>';
        $content .= '</ul></span>';

        $content .= '<span class="bpost-status-list"><label class="bpost-label">' . $Bpost->translate('label') . '</label><ul>';
        $content .= '<li><span class="Bpost-icon Bpost-icon-print-printed"></span>' . $Bpost->translate('printsuccesseddescription') . '</li>';
        $content .= '<li><span class="Bpost-icon Bpost-icon-print-error"></span>' . $Bpost->translate('printerrordescription') . '</li>';
        $content .='</ul></span>';

        $this->print_accordion($Bpost->translate('helpstatustitle'), $content, true);
    }


    public function print_help_labels()
    {
        global $Bpost;

        $content = '<ul>';
        $content .= '<li>' .  $Bpost->translate('labeltermsintro') . '</li>';
        if ($Bpost->translate('labelbuttondescription') != "12"){
            $content .= '<li>' .  $Bpost->translate('labelbuttondescription') . '</li>';
        }
        $content .= '<li><img src="' . BPOST_PLUGIN_URL .'/assets/images/print-label.png"/></li>';
        $content .= '<li>' . $Bpost->translate('labelterms') . '</li>';
        $content .= '</ul>';

        $this->print_accordion($Bpost->translate('helplabelstitle'), $content, true);
    }

    public function print_help_labels_bulk()
    {
        global $Bpost;

        $content  = '<div class="Bpost-settings__section">';
        $content .= $Bpost->translate('labelbulkprint');
        $content .= '</div>';

        $this->print_accordion($Bpost->translate('labelbulkprintitle'), $content, true);
    }



    public function print_help_wpapi ()
    {
        global $Bpost;

        $content  = '<div class="Bpost-settings__section">';

        $activateapihtml = '<p>' . $Bpost->translate('usewpapi') . ':';
        $activateapihtml .= '<select name="Bpost_usewpapi">'
            . '<option Value="0" ' . ($this->usewpapi ? '' : 'selected') . '>' . $Bpost->translate('no') .  '</option>'
            . '<option value="1" ' . ($this->usewpapi ? 'selected' : '') . '>' . $Bpost->translate('yes') .  '</option>';
        $activateapihtml .= '</select></p>';

        if($this->is_api_active ) {
            $content .= sprintf($Bpost->translate('useapihelp'), $activateapihtml);
        }
        else {
            $content .= sprintf($Bpost->translate('useapihelpinactive'), $activateapihtml);
        }

        $content .= '</div>';

        $this->print_accordion($Bpost->translate('useapititle'), $content,false);
    }
}

$Bpost_options_ui = new BpostOptionsUIDefault();
