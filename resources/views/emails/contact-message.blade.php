<x-mail::message>
# Pesan baru dari formulir KarirConnect

**Nama:** {{ $contactMessage->name }}  
**Email:** {{ $contactMessage->email }}  
**Subjek:** {{ $contactMessage->subject }}

{{ $contactMessage->message }}

</x-mail::message>
