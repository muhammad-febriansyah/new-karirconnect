<?php

return [

    /*
    | System account that owns the companies created for published external
    | jobs. It is inactive and has a random password; it only owns data.
    */
    'owner_email' => env('EXTERNAL_JOBS_OWNER_EMAIL', 'jobs-eksternal@karirconnect.system'),

    /*
    | Mailer used to forward applications for external jobs to the company's
    | recruitment email (an entry in config/mail.php "mailers").
    */
    'relay_mailer' => env('EXTERNAL_JOBS_RELAY_MAILER', 'smtp'),

];
