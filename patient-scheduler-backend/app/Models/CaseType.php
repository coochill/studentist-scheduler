<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CaseType extends Model
{
    protected $fillable = ['name', 'description'];

    public function patientCases(): HasMany
    {
        return $this->hasMany(PatientCase::class);
    }
}
