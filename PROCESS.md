# Frontend

* [yapildi]Frontend de ki gorsel ozellikler icon kutuphaneleri ve daha modern, goze hos gelen boostrap ve tailwind css kutuphaneleri ile gelistirilecektir.

* [yapildi]Sitenin her sayfasinin en altina yapan kisinin iletisim bilgileri [Rumata](https://github.com/rumata01) seklinde eklenecektir.

* [yapildi]Tum derslerin şık ve modern bir şekilde listeleneceği ana sayfa olusturulacak.(Ana sayfanin basinda 'Yönetim Bilişim Sistemleri Ders Notları' yazacak); tum diger derslere bu sayfadan gidilecek.

* [yapildi]Responsive tasarima uygun hale getir/zaten uygunsa hicbirsey yapma

* [yapildi]Uygulamanin rengini mavi tonlardan crimson tarzina cevir: goz yormayacak sekilde.

# Backend

* [yapildi]Derslerin bilgilerini backend de duzenli tutmak icin uploads klasorunun icine her ders icin ozel olarak olusturulmus klasorler olacak, bilgileri oradan cekecek.

* [yapildi]Derslerin markdown olarak tutulan veri yiginlari icin de markdown_notes klasorune her ders icin ayri ozel olusturulmus klasorler olacak, bilgileri oradan cekecek.

*

# Database

* Sqlite docker imajinda volume olarak saklanacak ve backend ile o sekilde konusacak
* Projenin kendisi de docker imaji olarak tasarlanacak
* Birlikte paketlenmis olacak ve tek tik ile kurulum yapilacak
* Eger 8000 portu dolu ise daha guvenli portlara bakilacak/varsayilan olarak 8000 portu guvenlik icin daha iyi portlar      ayarlanacak.

# Security

* Sunucunun icine sizma testleri yapmak imkansiz hale getirilecek
* Giden veriler container da 'ro' olarak isaretlenecek
* Database de ki admin bilerini kullanarak bir dogrulama yapilacak(su anki admin bilgileri kullanilarak)
* add_note.py dosyasina ilk basta bu dogrulama adimi daha sonra kodun kalanina erisim izni gelecek sekilde entegrasyon yapilacak
* suan init_db de(30-38.satilar) yer alan admin bilgilerini daha guvenli bir sekilde ekleme metodu arastirilacak(suan test asamasinda oldugu icin mudahale geremiyor).