# مصادر البيانات والترخيص — Meteo DZ

آخر مراجعة: 2026-11-08

## السياسة
لا تستخدم المنصة أي بيانات أو خرائط في صفحاتها العامة إلا بعد التحقق من الترخيص ونطاق الاستخدام والتغطية والإسناد. لا توضع مفاتيح API في ملفات Vite أو المتصفح أو المستودع. بيانات التوقعات وإعادة التحليل المناخي والرصد الرسمي أنواع مختلفة ويجب عدم دمجها دون توضيح.

## WeatherAPI.com — خرائط الطقس فقط
توثيق WeatherAPI يذكر أن طبقات الخرائط المجانية لا تحتاج مفتاح API، وتوفر طبقات الحرارة عند سطح 2م والهطول والضغط وسرعة الرياح، بفاصل ساعة ولمدة توقع تصل إلى ثلاثة أيام. هذه الطبقات مضافة كـ overlays على OpenStreetMap.

- الوثائق: https://www.weatherapi.com/docs/weather-maps/
- الأسعار: https://www.weatherapi.com/pricing
- لا تسمّ هذه الطبقات راداراً أو صور أقمار صناعية.
- رادار WeatherAPI المدفوع يغطي الولايات المتحدة وأجزاء من أوروبا؛ لا يُفترض منه تغطية الجزائر.

## WeatherAPI.com — توقعات الطقس
الخطة المجانية الحالية تعلن 100,000 طلب شهرياً وتسمح بالاستخدام التجاري، وتشمل الطقس الحالي وتوقع ثلاثة أيام وبعض بيانات جودة الهواء والتنبيهات المحدودة. لم يتم ربط هذا المسار بعد لأن مفتاح API لم يُنشأ.

- يجب وضع المفتاح في Cloudflare Worker Secret باسم WEATHERAPI_KEY.
- يمرر المتصفح الطلبات عبر Worker فقط، ولا يوضع المفتاح في متغير VITE أو ملفات JS.
- لا تستخدم واجهة الزراعة أو ET0 من WeatherAPI لأنها ضمن خطة Business المدفوعة.

## NASA POWER — سجل مناخي ومؤشرات زراعية أولية
تستخدم الصفحات API اليومية لنقاط الإحداثيات ضمن المجتمع الزراعي AG، والمتغيرات: T2M وT2M_MAX وT2M_MIN وPRECTOTCORR وWS10M وRH2M. تتوفر السلاسل الجوية اليومية منذ 1981، مع تأخر نموذجي يقارب يومين إلى ثلاثة أيام. يطلب المشروع الإشارة إلى NASA POWER كمصدر.

- API: https://power.larc.nasa.gov/api/temporal/daily/point
- الوثائق: https://power.larc.nasa.gov/docs/
- بيانات POWER ليست قياسات محطة أرضية؛ توصف كبيانات شبكية مشتقة من مصادر ونماذج وإعادة تحليل.
- يحتفظ الموقع بذاكرة محلية لمدة ست ساعات لتقليل الطلبات.
- لا نقدم توصيات ري أو مكافحة آفات. GDD والأمطار والصقيع والحرارة مؤشرات أولية فقط.

## Copernicus Climate Data Store
مصدر مرشح للمرحلة اللاحقة لتحليل ERA5 وERA5-Land. قبل تنزيل البيانات أو إعادة توزيع منتجاتها يجب فحص ترخيص كل مجموعة بيانات وشروط CDS الحالية، مع الإسناد الإلزامي إلى Copernicus Climate Change Service. لا يوجد استدعاء CDS في هذه الدفعة.

- الترخيص: https://cds.climate.copernicus.eu/licences/licence-to-use-copernicus-products
- الشروط: https://cds.climate.copernicus.eu/licences/terms-of-use-cds

## ما لم يتم تفعيله
- لم يتم نقل توقعات الموقع من Open-Meteo إلى WeatherAPI؛ يلزم إنشاء حساب مجاني وإصدار مفتاح، ثم إعداد Cloudflare Worker Secret WEATHERAPI_KEY وتهيئة عنوان Worker في VITE_WEATHER_API_PROXY_URL.
- لا يتم استخدام WeatherAPI Agriculture API أو ET0 لأنها من خطة Business المدفوعة.
- لا يتم استخدام WeatherAPI Radar API؛ خطتها Pro+ وتغطيتها المنشورة لا تثبت تغطية الجزائر.
- لا يوجد مصدر إنذار رسمي آلي أو إعادة نشر لنشرات ONM.

## مراجع
- https://www.weatherapi.com/pricing
- https://www.weatherapi.com/docs/weather-maps/
- https://www.weatherapi.com/docs/radar-api/
- https://power.larc.nasa.gov/
- https://power.larc.nasa.gov/docs/tutorials/service-data-request/api/
