<?php

namespace App\Enums;

enum SettingType: string
{
    case String = 'string';
    case Text = 'text';
    case Int = 'int';
    case Float = 'float';
    case Bool = 'bool';
    case Json = 'json';
    case File = 'file';
    case Password = 'password';
}
