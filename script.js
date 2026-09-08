/* =========================================================
   Emy Sweet — Store logic
========================================================= */

(function () {
    "use strict";

    // =========================
    // الإعدادات
    // =========================

    var CONFIG = {
        phone: "201001979538",       // رقم واتساب المتجر
        storeName: "Emy Sweet",
        currency: "جنيه",
        depositPercent: 50,          // نسبة العربون
        maxQuantity: 99,
        storageKey: "emySweetCart"
    };


    // =========================
    // أدوات مساعدة
    // =========================

    function $(selector, scope) {
        return (scope || document).querySelector(selector);
    }

    function $$(selector, scope) {
        return Array.prototype.slice.call(
            (scope || document).querySelectorAll(selector)
        );
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    // تنسيق الأرقام بالفواصل (1,250)
    function formatNumber(value) {
        return Number(value).toLocaleString("en-US");
    }


    // =========================
    // حالة السلة
    // =========================

    var cart = loadCart();

    function loadCart() {
        try {
            var saved = JSON.parse(localStorage.getItem(CONFIG.storageKey));

            if (!Array.isArray(saved)) {
                return [];
            }

            // نتحقق من كل عنصر محفوظ قبل استخدامه
            return saved
                .filter(function (item) {
                    return item &&
                        typeof item.name === "string" &&
                        isFinite(item.price) &&
                        isFinite(item.quantity) &&
                        item.quantity > 0;
                })
                .map(function (item) {
                    return {
                        name: item.name,
                        price: Number(item.price),
                        quantity: clamp(Math.round(item.quantity), 1, CONFIG.maxQuantity),
                        image: typeof item.image === "string" ? item.image : ""
                    };
                });
        } catch (error) {
            return [];
        }
    }

    function saveCart() {
        try {
            localStorage.setItem(CONFIG.storageKey, JSON.stringify(cart));
        } catch (error) {
            /* التخزين غير متاح (وضع التصفح الخاص) — نكمل عادي */
        }
    }

    function cartTotal() {
        return cart.reduce(function (sum, item) {
            return sum + (item.price * item.quantity);
        }, 0);
    }

    function cartCount() {
        return cart.reduce(function (sum, item) {
            return sum + item.quantity;
        }, 0);
    }


    // =========================
    // بطاقات المنتجات
    // =========================

    function initProducts() {

        $$(".product[data-product]").forEach(function (product) {

            var valueEl = $(".stepper-value", product);
            var minusEl = $(".stepper-btn.minus", product);
            var plusEl = $(".stepper-btn.plus", product);
            var addEl = $("[data-add-to-cart]", product);

            if (!valueEl || !minusEl || !plusEl || !addEl) {
                return;
            }

            function setQuantity(next) {
                var quantity = clamp(next, 1, CONFIG.maxQuantity);
                valueEl.textContent = quantity;
                minusEl.disabled = quantity <= 1;
                plusEl.disabled = quantity >= CONFIG.maxQuantity;
            }

            setQuantity(1);

            minusEl.addEventListener("click", function () {
                setQuantity(Number(valueEl.textContent) - 1);
            });

            plusEl.addEventListener("click", function () {
                setQuantity(Number(valueEl.textContent) + 1);
            });

            addEl.addEventListener("click", function () {
                addToCart(product, Number(valueEl.textContent));
                setQuantity(1);
            });
        });
    }

    function addToCart(product, quantity) {

        var name = product.dataset.product;
        var price = Number(product.dataset.price);

        if (!name || !isFinite(price)) {
            showToast("حصلت مشكلة في بيانات المنتج", true);
            return;
        }

        var existing = cart.find(function (item) {
            return item.name === name;
        });

        if (existing) {
            existing.quantity = clamp(existing.quantity + quantity, 1, CONFIG.maxQuantity);
        } else {
            cart.push({
                name: name,
                price: price,
                quantity: clamp(quantity, 1, CONFIG.maxQuantity),
                image: product.dataset.image || ""
            });
        }

        saveCart();
        renderCart();
        bumpBadge();

        showToast("تم إضافة « " + name + " » للسلة");
    }


    // =========================
    // عرض السلة
    // =========================

    var itemsEl = $("#cartItems");
    var emptyEl = $("#cartEmpty");
    var checkoutEl = $("#cartCheckout");
    var totalEl = $("#cartTotal");
    var depositEl = $("#cartDeposit");
    var badgeEl = $("#cartCount");
    var mobileCartBarEl = $(".mobile-cart-bar");
    var mobileCartCountEl = $("#mobileCartCount");
    var mobileCartTotalEl = $("#mobileCartTotal");

    function renderCart() {

        var count = cartCount();
        var total = cartTotal();

        // شارة العدد
        badgeEl.textContent = count;
        badgeEl.dataset.empty = count === 0 ? "true" : "false";
        if (mobileCartBarEl) {
            mobileCartBarEl.hidden = count === 0;
            mobileCartCountEl.textContent = count;
            mobileCartTotalEl.textContent = formatNumber(total);
            document.body.classList.toggle("has-cart-items", count > 0);
        }
        $("[data-open-cart]").setAttribute(
            "aria-label",
            count === 0
                ? "فتح سلة الطلبات — السلة فاضية"
                : "فتح سلة الطلبات — " + count + " منتج"
        );

        // الحالة الفارغة
        var isEmpty = cart.length === 0;
        emptyEl.hidden = !isEmpty;
        checkoutEl.hidden = isEmpty;

        // العناصر
        itemsEl.textContent = "";

        cart.forEach(function (item, index) {
            itemsEl.appendChild(buildCartItem(item, index));
        });

        // الإجماليات
        totalEl.textContent = formatNumber(total);
        depositEl.textContent = formatNumber(
            Math.round(total * CONFIG.depositPercent / 100)
        );
    }

    // نبني العنصر بـ DOM API (مش innerHTML) عشان أمان النصوص
    function buildCartItem(item, index) {

        var row = document.createElement("div");
        row.className = "cart-item";

        if (item.image) {
            var thumb = document.createElement("img");
            thumb.className = "cart-item-thumb";
            thumb.src = item.image;
            thumb.alt = "";
            thumb.loading = "lazy";
            row.appendChild(thumb);
        }

        var main = document.createElement("div");
        main.className = "cart-item-main";

        // السطر العلوي: الاسم + زر الحذف
        var top = document.createElement("div");
        top.className = "cart-item-top";

        var nameWrap = document.createElement("div");

        var name = document.createElement("span");
        name.className = "cart-item-name";
        name.textContent = item.name;

        var unit = document.createElement("span");
        unit.className = "cart-item-unit";
        unit.textContent = formatNumber(item.price) + " " + CONFIG.currency + " للقطعة";

        nameWrap.appendChild(name);
        nameWrap.appendChild(unit);

        var remove = document.createElement("button");
        remove.type = "button";
        remove.className = "cart-item-remove";
        remove.textContent = "×";
        remove.setAttribute("aria-label", "حذف " + item.name + " من السلة");
        remove.addEventListener("click", function () {
            removeItem(index, row);
        });

        top.appendChild(nameWrap);
        top.appendChild(remove);

        // السطر السفلي: الكمية + الإجمالي
        var bottom = document.createElement("div");
        bottom.className = "cart-item-bottom";

        var stepper = document.createElement("div");
        stepper.className = "stepper";
        stepper.setAttribute("role", "group");
        stepper.setAttribute("aria-label", "كمية " + item.name);

        var minus = document.createElement("button");
        minus.type = "button";
        minus.className = "stepper-btn minus";
        minus.textContent = "−";
        minus.setAttribute("aria-label", "تقليل كمية " + item.name);
        minus.addEventListener("click", function () {
            changeQuantity(index, -1, row);
        });

        var value = document.createElement("span");
        value.className = "stepper-value";
        value.textContent = item.quantity;

        var plus = document.createElement("button");
        plus.type = "button";
        plus.className = "stepper-btn plus";
        plus.textContent = "+";
        plus.disabled = item.quantity >= CONFIG.maxQuantity;
        plus.setAttribute("aria-label", "زيادة كمية " + item.name);
        plus.addEventListener("click", function () {
            changeQuantity(index, 1, row);
        });

        stepper.appendChild(plus);
        stepper.appendChild(value);
        stepper.appendChild(minus);

        var lineTotal = document.createElement("span");
        lineTotal.className = "cart-item-total";
        lineTotal.textContent =
            formatNumber(item.price * item.quantity) + " " + CONFIG.currency;

        bottom.appendChild(stepper);
        bottom.appendChild(lineTotal);

        main.appendChild(top);
        main.appendChild(bottom);
        row.appendChild(main);

        return row;
    }

    // ناقص واحد على كمية 1 = حذف المنتج
    function changeQuantity(index, delta, row) {

        var item = cart[index];

        if (!item) {
            return;
        }

        if (item.quantity + delta < 1) {
            removeItem(index, row);
            return;
        }

        item.quantity = clamp(item.quantity + delta, 1, CONFIG.maxQuantity);

        saveCart();
        renderCart();
    }

    function removeItem(index, row) {

        var item = cart[index];

        if (!item) {
            return;
        }

        var name = item.name;

        // أنيميشن خروج بسيط قبل إعادة الرسم
        if (row) {
            row.classList.add("removing");
        }

        setTimeout(function () {
            cart.splice(index, 1);
            saveCart();
            renderCart();
            showToast("تم حذف « " + name + " » من السلة");
        }, row ? 200 : 0);
    }

    function bumpBadge() {
        badgeEl.classList.remove("pop");
        void badgeEl.offsetWidth; // إعادة تشغيل الأنيميشن
        badgeEl.classList.add("pop");

        setTimeout(function () {
            badgeEl.classList.remove("pop");
        }, 250);
    }


    // =========================
    // فتح / إغلاق السلة
    // =========================

    var panelEl = $("#cartPopup");
    var overlayEl = $("#cartOverlay");
    var lastFocused = null;

    function openCart() {

        lastFocused = document.activeElement;

        overlayEl.hidden = false;

        // نجبر المتصفح على حساب الإطار قبل الأنيميشن
        requestAnimationFrame(function () {
            overlayEl.classList.add("show");
            panelEl.classList.add("show");
        });

        panelEl.setAttribute("aria-hidden", "false");
        document.body.classList.add("no-scroll");

        var focusTarget = cart.length
            ? $("#customerName")
            : $(".cart-close", panelEl);

        if (focusTarget) {
            setTimeout(function () {
                focusTarget.focus({ preventScroll: true });
            }, 350);
        }
    }

    function closeCart() {

        overlayEl.classList.remove("show");
        panelEl.classList.remove("show");
        panelEl.setAttribute("aria-hidden", "true");
        document.body.classList.remove("no-scroll");

        setTimeout(function () {
            overlayEl.hidden = true;
        }, 350);

        if (lastFocused && document.contains(lastFocused)) {
            lastFocused.focus({ preventScroll: true });
        }
    }

    function isCartOpen() {
        return panelEl.classList.contains("show");
    }

    // حبس التركيز داخل اللوحة وهي مفتوحة
    function trapFocus(event) {

        if (event.key !== "Tab" || !isCartOpen()) {
            return;
        }

        var focusables = $$(
            'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
            panelEl
        ).filter(function (el) {
            return !el.disabled && el.offsetParent !== null;
        });

        if (!focusables.length) {
            return;
        }

        var first = focusables[0];
        var last = focusables[focusables.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }


    // =========================
    // واتساب
    // =========================

    function openWhatsApp(message) {

        var url = "https://wa.me/" + CONFIG.phone +
            "?text=" + encodeURIComponent(message);

        var win = window.open(url, "_blank", "noopener");

        // بعض المتصفحات بتحجب النافذة المنبثقة — نفتح في نفس التبويب
        if (!win) {
            window.location.href = url;
        }
    }

    function buildOrderMessage(customer) {

        var lines = [];
        var total = cartTotal();
        var deposit = Math.round(total * CONFIG.depositPercent / 100);

        lines.push("*" + CONFIG.storeName.toUpperCase() + "*");
        lines.push("━━━━━━━━━━━━━━━━");
        lines.push("");
        lines.push("*تفاصيل الطلب*");
        lines.push("");

        cart.forEach(function (item, index) {
            lines.push("*" + (index + 1) + ". " + item.name + "*");
            lines.push("الكمية: " + item.quantity);
            lines.push("سعر القطعة: " + formatNumber(item.price) + " " + CONFIG.currency);
            lines.push("الإجمالي: " + formatNumber(item.price * item.quantity) + " " + CONFIG.currency);
            lines.push("");
        });

        lines.push("━━━━━━━━━━━━━━━━");
        lines.push("*إجمالي الطلب: " + formatNumber(total) + " " + CONFIG.currency + "*");
        lines.push("العربون (" + CONFIG.depositPercent + "%): " + formatNumber(deposit) + " " + CONFIG.currency);
        lines.push("مصاريف الشحن: حسب الموقع");
        lines.push("━━━━━━━━━━━━━━━━");
        lines.push("");
        lines.push("*بيانات العميل*");
        lines.push("");
        lines.push("الاسم: " + customer.name);
        lines.push("رقم الموبايل: " + customer.phone);
        lines.push("العنوان: " + customer.address);

        if (customer.notes) {
            lines.push("ملاحظات: " + customer.notes);
        }

        lines.push("");
        lines.push("━━━━━━━━━━━━━━━━");
        lines.push("شكرًا لاختيارك " + CONFIG.storeName);

        return lines.join("\n");
    }


    // =========================
    // التحقق من البيانات
    // =========================

    function setFieldError(input, message) {

        var field = input.closest(".field");
        var errorEl = $('[data-error-for="' + input.id + '"]');

        if (message) {
            field.classList.add("has-error");
            input.setAttribute("aria-invalid", "true");

            if (errorEl) {
                errorEl.textContent = message;
                errorEl.hidden = false;
            }
        } else {
            field.classList.remove("has-error");
            input.removeAttribute("aria-invalid");

            if (errorEl) {
                errorEl.hidden = true;
            }
        }
    }

    function validateField(input) {

        var value = input.value.trim();

        if (input.id === "customerName") {
            if (!value) {
                setFieldError(input, "من فضلك اكتب اسمك");
                return false;
            }
            if (value.length < 3) {
                setFieldError(input, "الاسم قصير جدًا");
                return false;
            }
        }

        if (input.id === "customerPhone") {
            // أرقام مصر: 010 / 011 / 012 / 015 + 8 أرقام
            if (!value) {
                setFieldError(input, "من فضلك اكتب رقم الموبايل");
                return false;
            }
            if (!/^01[0125]\d{8}$/.test(value)) {
                setFieldError(input, "رقم غير صحيح — لازم يكون 11 رقم ويبدأ بـ 01");
                return false;
            }
        }

        if (input.id === "customerAddress") {
            if (!value) {
                setFieldError(input, "من فضلك اكتب عنوان التوصيل");
                return false;
            }
            if (value.length < 10) {
                setFieldError(input, "العنوان مختصر — اكتبه بالتفصيل عشان يوصلك صح");
                return false;
            }
        }

        setFieldError(input, "");
        return true;
    }

    function initForm() {

        var form = $("#customerForm");
        var nameEl = $("#customerName");
        var phoneEl = $("#customerPhone");
        var addressEl = $("#customerAddress");
        var notesEl = $("#customerNotes");

        // رقم الموبايل: أرقام إنجليزية فقط (بنحوّل الأرقام العربية كمان)
        phoneEl.addEventListener("input", function () {
            phoneEl.value = phoneEl.value
                .replace(/[٠-٩]/g, function (digit) {
                    return String.fromCharCode(digit.charCodeAt(0) - 0x0660 + 48);
                })
                .replace(/\D/g, "")
                .slice(0, 11);
        });

        // نشيل رسالة الخطأ أول ما المستخدم يصلح الحقل
        [nameEl, phoneEl, addressEl].forEach(function (input) {
            input.addEventListener("blur", function () {
                if (input.value.trim()) {
                    validateField(input);
                }
            });

            input.addEventListener("input", function () {
                if (input.closest(".field").classList.contains("has-error")) {
                    validateField(input);
                }
            });
        });

        form.addEventListener("submit", function (event) {

            event.preventDefault();

            if (cart.length === 0) {
                showToast("السلة فاضية — اختار حاجة من المنيو الأول", true);
                return;
            }

            var fields = [nameEl, phoneEl, addressEl];
            var firstInvalid = null;

            fields.forEach(function (input) {
                if (!validateField(input) && !firstInvalid) {
                    firstInvalid = input;
                }
            });

            if (firstInvalid) {
                firstInvalid.focus();
                firstInvalid.scrollIntoView({ block: "center", behavior: "smooth" });
                showToast("من فضلك راجع البيانات المطلوبة", true);
                return;
            }

            openWhatsApp(buildOrderMessage({
                name: nameEl.value.trim(),
                phone: phoneEl.value.trim(),
                address: addressEl.value.trim(),
                notes: notesEl.value.trim()
            }));

            showToast("جاري فتح واتساب بالطلب…");
        });
    }


    // =========================
    // Toast
    // =========================

    var toastEl = $("#toast");
    var toastTimer = null;

    function showToast(message, isError) {

        clearTimeout(toastTimer);

        toastEl.textContent = message;
        toastEl.classList.toggle("error", Boolean(isError));
        toastEl.classList.add("show");

        toastTimer = setTimeout(function () {
            toastEl.classList.remove("show");
        }, isError ? 3500 : 2200);
    }


    // =========================
    // التشغيل
    // =========================

    function init() {

        initProducts();
        initForm();
        renderCart();

        // فتح / إغلاق السلة
        $$("[data-open-cart]").forEach(function (el) {
            el.addEventListener("click", openCart);
        });

        $$("[data-close-cart]").forEach(function (el) {
            el.addEventListener("click", closeCart);
        });

        // أزرار واتساب العامة
        $$("[data-whatsapp]").forEach(function (el) {
            el.addEventListener("click", function () {
                openWhatsApp(
                    "*" + CONFIG.storeName.toUpperCase() + "*\n\n" +
                    "مرحبًا، عايز أستفسر عن المنيو 🤎"
                );
            });
        });

        // Escape يقفل السلة + حبس التركيز
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && isCartOpen()) {
                closeCart();
            }
            trapFocus(event);
        });

        // ظل الهيدر عند النزول
        var header = $("#siteHeader");

        var onScroll = function () {
            header.classList.toggle("is-stuck", window.scrollY > 8);
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();

        // مزامنة السلة بين التبويبات المفتوحة
        window.addEventListener("storage", function (event) {
            if (event.key === CONFIG.storageKey) {
                cart = loadCart();
                renderCart();
            }
        });

        // سنة الحقوق
        $("#year").textContent = new Date().getFullYear();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
