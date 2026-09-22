<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Patient extends Model
{
    protected $fillable = [
        'first_name',
        'last_name',
        'contact_number',
        'date_of_birth',
        'address',
        'notes',
    ];

    public function patientCases(): HasMany
    {
        return $this->hasMany(PatientCase::class);
    }
}
