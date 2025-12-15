<?php
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

return array(
    'Bpostcolumntitle' => 'Status / Handling',
    'automaticexport' => 'Automatisk Eksport',
    'automaticexportdescription' => 'Send ordrer til Bpost når status matcher',
    'A new token will be automatically requested when this one expires' => 'Et nyt token vil blive <b>automatisk anmodet</b>, når dette udløber',
    "api sent status" => "api sendt status",
    "api sent trackingId:" => "api sendt trackingId:",
    'Carriers Available In your contract' => 'Transportører tilgængelige i din kontrakt',
    'Has Pickup' => 'Har Afhentning',
    'Click' => 'Klik',
    'Choose Pickup Location' => 'Vælg Afhentningssted',
    'geolocationfailed' => 'Kunne ikke få breddegrad, længdegrad for adressen',
    'Credentials' => 'Legitimationsoplysninger',
    "Different carrier selected by the api" => "Forskellig transportør valgt af api'en",
    "Don't forget to set the appropriate cost for each carrier if you don't have free shipping for all orders" => "Glem ikke at angive den passende pris for hver transportør, hvis du ikke har gratis fragt for alle ordrer",
    "Error on Export" => "Fejl ved Eksport",
    "Exported" => 'Eksporteret',
    'Export Preset Orders' => 'Eksporter Forudindstillede Ordrer',
    'Export Preset Orders to' => 'Eksporter Forudindstillede Ordrer til',
    'Export to' => 'Eksporter til',
    'expires at' => 'Udløber den',
    'Invalid Credentials' => 'Ugyldige Legitimationsoplysninger',
    'If a google key is provided the map served will be a google map else an openmap will be shown' => "Hvis en Google-nøgle angives, vil det kort, der serveres i kassen for at tilbyde Servicepoint-placeringer, være et Google-kort i stedet for et standard OpenMap. Sørg for at aktivere <a href='%s'>Geokodning</a>",
    'if not opened' => 'hvis ikke åbnet',
    'No pickup points returned by the carrier for this address' => 'Ingen afhentningspunkter returneret af transportøren for denne adresse',
    'Not Exported' => 'Ikke Eksporteret',
    'Pickup Point' => 'Afhentningssted',
    'Private Key' => 'Privat Nøgle',
    'Public Key' => 'Offentlig Nøgle',
    'maptitle' => 'Vælg et Afhentningssted',
    'Select' => 'Vælg',
    'Selected Pickup' => 'Valgt Afhentning',
    'shipping zones' => 'fragtzoner',
    'Sent %d orders. <br/>Exported: %d <br/> With Errors: %d' => 'Sendt %d ordrer. <br/>Eksporteret: %d <br/> Med Fejl: %d',
    "Unknown status of id" => 'Ukendt status for id',
    "You can add them to" => "Du kan tilføje dem til",
    'When you click "Export All" in the orders view, export all orders not exported successfully, with status' => 'Når du klikker på "Eksporter Forudindstillede Ordrer" i ordreoversigten, eksporteres alle ordrer, der ikke er eksporteret succesfuldt, med status',
    'Service level' => 'Service Niveau',
    'printlabel' => 'Udskriv label',
    'printlabeltitle' => 'Udskriv label',
    'order'  => 'Ordre',
    'label'  => 'Mærkat',
    'requestinglabel' => 'Anmoder om mærkat',
    'labelclick' => 'klik % for at få din mærkat, hvis et nyt vindue ikke åbnede',
    'labelprinted' => 'Label Udskrevet',
    'labeltermsintro' => "<p>Du kan udskrive labels manuelt eller automatisk ved at eksportere dem til Bpost, men du kan også udskrive labels direkte fra Woocommerce.</p><p>Hvis du ønsker at udskrive labels direkte fra Woocommerce, skal du kontrollere, at du har læst disse vilkår under \"udskriv label\" i fanen \"indstillinger\".</p><p>For at udskrive en label fra ordrelisten skal du klikke på \"udskriv label\"-knappen.</p>",
    'labelterms' => "Så snart du klikker på 'udskriv etiket'-knappen, sker følgende:
    <ol class=\"Bpost-list\">
    <li>Ordren eksporteres til Bpost, og ordredetaljerne sendes til transportøren, så hvis indsendelsen er vellykket, kan vi sende en forsendelsesmærkat tilbage til shoppingplatformen.</li>
    <li>Du kan angive labelformatet i Bpost-appen \"Indstillinger\" > \"Udskrivning\" > \"Udskriv etiketformat\"</li>
    <li>Hvis ordren ikke kan eksporteres, returneres en fejlmeddelelse med yderligere oplysninger om, hvorfor eksporten mislykkedes.</li>
    <li>Hvis ordren tidligere blev eksporteret, men ingen etiket er forbundet med den, genudsendes ordredataene. Eventuelle ændringer i adressen opdateres.</li>
    <li>Hvis din <i>kunde vælger en af ​​Bpost-transportørerne ved kassen</i>, vil transportøren og de muligheder, du har angivet for den i woocommerce, <i>givet at de er gyldige for forsendelsen</i>, blive tildelt forsendelsen</li>
    <li>Hvis der ikke er tilknyttet nogen Bpost-transportør til ordren, <i>vælges transportøren og indstillingerne i Bpost forsendelsesportalen under \"Indstillinger\" > \"Standardindstillinger\" > \"Standardtransportør\" automatisk.</i></li>
    <li>Hvis du ikke har valgt en transportør i \"Standard Transportør\". Den <i>først tilgængelige transportør
    <li>Hvis du ikke har valgt en transportør i \"Standard Transportør\". Den <i>først tilgængelige transportør, der sender til den angivne destination</i>, vælges automatisk.</li>
    <li><b>Hvis du laver en fejl, kan du kontakte Bpost gennem supportafsnittet på hjemmesiden, og vi vil hjælpe dig. Tid er afgørende, bekræft venligst, om label er korrekt, efter at du har modtaget den.</b></li>
    </ol>",
    'labelbuttondescription' => 'For at udløse udskrivning af en label skal du i ordrelisten klikke på labelknappen',
    'labelagree' => 'Jeg har læst hjælpesektionen i hjælpetabellen, og jeg forstår, hvordan labels udskrives fra woocommerce.',
    'labellocked' => 'Udskrivning af label deaktiveret. Gå til Bpost-indstillingerne og kontroller, om du forstår, hvordan udskrivning af label fungerer',
    'labelbulkprintitle' => 'Stor udskrivning af label',
    'labelbulkprint' => 'Hvis du vil udskrive labels til mere end én ordre ad gangen. I ordrelisten:
    <ol class="Bpost-list">
    <li>vælg de ordrer, du vil udskrive en label til </li>
    <li>Vælg Bpost: udskriv label, fra handlingsrullelisten</li>
    <li>Klik på "anvend"</li>
    </ol>',
    'pickupbehaviour' => 'Valg af Afhentningspunkt er',
    'pickuppointbehavior0' => 'Valgfrit',
    'pickuppointbehavior1' => 'Obligatorisk',
    'pickuppointbehavior2' => 'Deaktiveret',
    'mandatorypointmsg' => "Vælg venligst et Afhentningssted eller vælg en anden forsendelsesmetode",
//  WOO SPECIFIC STUFF
    'PostNL uses a custom format for Netherlands addresses which will cause export errors. Please disable PostNL to use' => 'PostNL bruger et brugerdefineret format til hollandske adresser, hvilket vil medføre eksportfejl. Deaktiver venligst PostNL for at bruge',
    'setcredentials' =>  'ugyldige nøgler! Bekræft i Bpost-indstillingerne, om du har kopieret dem korrekt',
    'pickuppointsoptions' => "Afhentningssteder",
    'pickuppointsdisable' => "Vis ikke denne mulighed for dine kunder, inkludér ikke knappen eller kortet ved kassen",
    'yes'=>'ja',
    'no'=>'nej',
    'service_level'=>'Service Niveau',
    'cashservice' => 'Betaling ved levering',
    'sendinsured' => 'Forsikret',
    'extraoptions' => 'Ekstra Indstillinger',
    'settings' => 'Indstillinger',
    'help' => 'Hjælp',
    'exportdescription' => '<p>I Ordrelisten kan du eksportere ordrer ved:</p>
    <b>Eksporter Alle Ordrer</b><p>Vil kun eksportere ordrer, der ikke blev eksporteret, og har en af de statusser, du har konfigureret i <i>Eksporter alle</i> i indstillingerne.</p>
    <br/><b>Eksporter valgte ordrer</b> <p>Vil sende til appen enhver valgt ordre, uanset status. Dette giver dig mulighed for at geneksportere ordrer, hvis du sletter dem i appen.</p>',
    'statusdescription' => 'I ordrelisten kan du se ordre-eksportstatus. Hvis der opstår en fejl enten under eksport eller udskrivning af labelen, bliver statusikonet rødt.
    <p><b><i>Hold musen over statusikonet for at se eksporthistorikken for ordren</i></b></p><br/>Eksportstatusser er angivet nedenfor',
    'notexporteddescription' => 'Ordre ikke eksporteret',
    'successdescription' => 'Ordre eksporteret succesfuldt',
    'exporterrordescription' => 'Ordre blev eksporteret <u>med fejl</u>',
    'notprinteddescription' => 'Ingen etiket endnu',
    'printsuccesseddescription' => 'Label udskrevet succesfuldt',
    'printerrordescription' => 'Anmodning om label <u>returnerede fejl</u>',
    'useapititle' => 'Problemer med ordrestatusopdateringer?',
    'usewpapi' => "Brug WordPress API'en til at sende ordreopdateringer tilbage",
    'useapihelpinactive' => "<p>Når du har konfigureret ordrestatusser til automatisk at blive opdateret ved visse begivenheder (ved import, labeloprettelse og/eller levering), men du ser 'ikke fundet' resultater i sporingsopdateringerne for forsendelser i din Bpost-konto, kan plugin'en opdatere ordrestatusser automatisk via WordPress API'en som et alternativ.</p>
<p>Imidlertid synes WordPress API'en at være deaktiveret på din hjemmeside. Derfor har vi ingen alternativ til at opdatere ordrestatusser automatisk.
<br/>Kontakt venligst din webudvikler for at aktivere din WordPress API, og gå tilbage til denne skærm for at finde instruktioner. %s</p>
    ",
    'useapihelp' => 'Når du har konfigureret ordrestatusser til automatisk at blive opdateret ved visse begivenheder (ved import, labeloprettelse og/eller levering), men du ser "ikke fundet" resultater i sporingsopdateringerne for forsendelser i din Bpost-konto, skal du tage følgende skridt:
<ol>
    <li>Aktivér "Brug WordPress API til ordreopdateringer" nedenfor. %s </li>
    <li>Gå til din Bpost-konto for at oprette nye nøgler fra "Indstillinger" > "Integrationer" > "N
    <li>Gå til din Bpost-konto for at oprette nye nøgler fra "Indstillinger" > "Integrationer" > "Nøglehåndtering" og aktiver nøglerne.</li>
    <li>Indsæt disse nye nøgler i Bpost Legitimationsfeltet i Bpost-indstillingerne her i WordPress, og klik på "Gem ændringer"-knappen.</li>
</ol>',
//  Sub values..
    'extraoptions55' => '&nbsp;&nbsp;&nbsp;&nbsp;>',
    'extraoptions73' => '&nbsp;&nbsp;&nbsp;&nbsp;>',
//  Marketplace
    'sending' => 'Sender ...',
    'requestaccount' => 'Anmod om Bpost-konto for denne leverandør',
    'submitrequest' => 'Anmod om Konto',
    'streetname' => 'Gadenavn',
    'zipcode' => 'Postnummer',
    'city' => 'By',
    'province' => 'Provins',
    'country' => 'Land',
    'requestsent' => 'Vores team vender tilbage til dig snart.',
    'connect2Bpost' => 'Forbind til Bpost',
    'disconnectBpost' => 'Frakobl fra Bpost',
    'welcometitle' => 'Velkommen til Bpost & PakketMail',
    'welcomedescription' => 'Den Multi-carrier forsendelsessoftware, der sparer dig tid og penge!',
    'welcomeskip' => 'Spring dette over, jeg har allerede en konto!',
    'fiscal' => 'Fiskal',
    'start'  => "Lad os komme i gang",
    'stepback' => 'Gå Tilbage',
    'continue' => 'Fortsæt',
    'step1title'=>'Send hurtigere og bedre',
    'step1description'=>'med disse tre nøgleforbedringer af din forsendelsesproces',
    'feature1title' => 'Spar tid med automatisering',
    'feature1description' => 'Optimer dine leverancer ved at automatisere nogle af de mest tidskrævende dele af processen.
<br/><br/>Forsendelseslabels, Track&Trace e-mails,
Returetiketter, Forsendelsesstatus',
    'feature2title' => 'Aggregering gør dit liv nemmere',
    'feature2description' => 'Saml forskellige muligheder og muligheder i én enkel online platform.
<br/><br/>Flere transportører, Forsendelsesoptegnelser, 
Alle salgskanaler',
    'feature3title' => 'Få førsteklasses assistance',
    'feature3description' => 'Stol på vores førsteklasses kundeservice til at hjælpe dig med alle forsendelsesrelaterede spørgsmål.
<br/><br/>Online- og telefonsupport, Bro mellem din butik og transportørerne,
Forbedring af din kundeservice',
    'step2title' =>  'Dine Forsendelsesoplysninger',
    'step2description' => 'Hvorfor har vi brug for dette? For at betjene dig bedre og give dig de bedste muligheder.',
    'averageshipments' => 'Gennemsnitlige forsendelser pr. måned',
    'companyname' => 'Firmanavn',
    'contactperson' => 'Kontaktperson',
    'contactemail' => 'Kontakt e-mail',
    'contactphone' => 'Kontakt telefon',
    'origincountry' => 'Land Jeg sender fra',
    'contriesship' => 'Lande, jeg i øjeblikket sender til',
    'step3title' =>'Dine kontooplysninger er på vej!',
    'step3description' => 'Tak fordi du er med! Du vil modtage alle detaljerne via den angivne e-mail.',
    'finishsetup' => 'Afslut Opsætning',
    'Bpostsettings' => 'Bpost Indstillinger',
    'whopays' => 'Hvem betaler Bpost?',
    'you' => 'Du',
    'yourvendors' => 'Dine Leverandører',
    'whopaysdescription' => 'Hvis du betaler Bpost, vil enhver leverandør, der sender med Bpost, arve de takster, du definerer',
    'inheritadminrates' => 'Forsendelsesregler defineres af administrator',
    'errors' => 'Fejl',
    'exportvendorsbtn' => 'Eksportér Leverandørliste til Csv Fil',
    'defaultshipping' => 'Standard Forsendelsestype',
    'by_weight' => 'Forsendelse efter Vægt',
    'by_country' => 'Forsendelse efter Land',
    'provincesdescription' => 'erklær yderligere provinser',
    'hidenotfree' => 'Hvis mindst én forsendelsesmetode er tilgængelig med omkostninger 0, skjul enhver forsendelsesmetode med omkostninger > 0',
    'hidenotfreetitle' => 'Skjul Forsendelsesmetoder',
    'excludeclasses' => 'Hvis mindst én vare i kurven indeholder disse klasser, skal du ikke vise denne metode',
    'exportvirtualtitle' => 'Virtuelle produkter & Virtuelle ordrer',
    'exportvirtualorders' => 'Eksportér ordrer indeholdende kun virtuelle produkter',
    'exportvirtualproducts' => 'Ved eksport tilføj virtuelle produkter til ordrer',
    'mapfieldmandatory' => 'obligatorisk. Angiv venligst en værdi.',
    'multiorderlabelwarn' => 'Hvis du vil udskrive mere end én label ad gangen, skal du bruge applikationen'
);