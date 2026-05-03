<?php

namespace App\Models;

use Database\Factories\LegalPageFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'slug',
    'title',
    'body',
])]
class LegalPage extends Model
{
    /** @use HasFactory<LegalPageFactory> */
    use HasFactory;
}
