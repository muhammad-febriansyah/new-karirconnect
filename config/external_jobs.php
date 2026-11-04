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

    /*
    | Sender address for relayed applications. Use a neutral mailbox on a
    | domain the relay mailer is allowed to send for (SPF/DKIM), otherwise
    | the mail lands in spam. The sender name is always the candidate's.
    */
    'relay_from_address' => env('EXTERNAL_JOBS_RELAY_FROM_ADDRESS'),

];
