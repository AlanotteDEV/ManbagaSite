/* ============================================================
   index-init.js — rimpiazza tutti gli onclick inline di index.html
   con addEventListener per rimuovere 'unsafe-inline' dalla CSP.
   ============================================================ */
(function () {
    'use strict';

    /* ── Delegazione errori img (sostituisce onerror="…" nel HTML e nel JS dinamico) ── */
    document.addEventListener('error', function (e) {
        if (e.target.tagName === 'IMG' && !e.target.dataset.errHandled) {
            e.target.dataset.errHandled = '1';
            e.target.src = 'https://placehold.co/400x500/0a0a0a/333?text=Cover';
        }
    }, true /* capture: intercetta prima del target */);

    document.addEventListener('DOMContentLoaded', function () {

        /* ── Quiz FAB ── */
        var quizFab = document.getElementById('quiz-hint-fab');
        if (quizFab) {
            quizFab.addEventListener('click', function () {
                var el = document.getElementById('quiz');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            });
        }

        /* ── Product modal — chiudi su click backdrop ── */
        var productModal = document.getElementById('product-modal');
        if (productModal) {
            productModal.addEventListener('click', function (e) {
                if (e.target === productModal) closeProductModal();
            });
        }

        /* ── Tutti i bottoni .btn-modal-close (prodotto + admin) ── */
        document.addEventListener('click', function (e) {
            if (e.target.closest('.btn-modal-close')) {
                if (typeof closeProductModal === 'function') closeProductModal();
                if (typeof closeAdminModal === 'function') closeAdminModal();
            }

            /* ── Product card carosello "Appena Arrivati" ── */
            var card = e.target.closest('.product-card[data-pid]');
            if (card && typeof openProductModal === 'function') {
                openProductModal(card.dataset.pid); return;
            }

            /* ── Zoom immagine nel modal prodotto ── */
            var imgWrap = e.target.closest('.pd-img-wrap[data-img]');
            if (imgWrap && typeof zoomProductImage === 'function') {
                zoomProductImage(imgWrap.dataset.img, imgWrap.dataset.title); return;
            }
        });

        /* ── Tab eventi ── */
        document.querySelectorAll('.ev-tab[data-type]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (typeof switchEvTab === 'function') switchEvTab(btn.dataset.type);
            });
        });

        /* ── Twitch card (click + tastiera) ── */
        var twitchCard = document.getElementById('twitch-card');
        if (twitchCard) {
            twitchCard.addEventListener('click', function () {
                if (typeof loadTwitchEmbed === 'function') loadTwitchEmbed();
            });
            twitchCard.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (typeof loadTwitchEmbed === 'function') loadTwitchEmbed();
                }
            });
        }

        /* ── Apri modal recensione ── */
        var btnOpenReview = document.querySelector('.btn[data-action="open-review"]');
        if (btnOpenReview) {
            btnOpenReview.addEventListener('click', function () {
                if (typeof openReviewModal === 'function') openReviewModal();
            });
        }

        /* ── Review modal — chiudi su backdrop ── */
        var reviewModal = document.getElementById('review-modal');
        if (reviewModal) {
            reviewModal.addEventListener('click', function (e) {
                if (e.target === reviewModal && typeof closeReviewModal === 'function') closeReviewModal();
            });
        }

        /* ── Bottone chiudi modal recensione ── */
        var btnCloseReview = document.getElementById('rv-close-btn');
        if (btnCloseReview) {
            btnCloseReview.addEventListener('click', function () {
                if (typeof closeReviewModal === 'function') closeReviewModal();
            });
        }

        /* ── Bottone chiudi su success view ── */
        var btnCloseSuccess = document.getElementById('rv-success-close');
        if (btnCloseSuccess) {
            btnCloseSuccess.addEventListener('click', function () {
                if (typeof closeReviewModal === 'function') closeReviewModal();
            });
        }

        /* ── Stelle recensione — delegazione su #rv-stars ── */
        var starsContainer = document.getElementById('rv-stars');
        if (starsContainer) {
            starsContainer.addEventListener('click', function (e) {
                var btn = e.target.closest('.rv-star-btn');
                if (btn && typeof selectStar === 'function') selectStar(parseInt(btn.dataset.v, 10));
            });
            starsContainer.addEventListener('mouseover', function (e) {
                var btn = e.target.closest('.rv-star-btn');
                if (btn && typeof hoverStar === 'function') hoverStar(parseInt(btn.dataset.v, 10));
            });
            starsContainer.addEventListener('mouseleave', function () {
                if (typeof hoverStar === 'function') hoverStar(0);
            });
        }

        /* ── Invia recensione ── */
        var btnSubmitReview = document.getElementById('rv-submit-btn');
        if (btnSubmitReview) {
            btnSubmitReview.addEventListener('click', function () {
                if (typeof submitRecensione === 'function') submitRecensione();
            });
        }

        /* ── Form contatti ── */
        var contactForm = document.querySelector('.contact-form-body');
        if (contactForm) {
            contactForm.addEventListener('submit', function (e) {
                if (typeof sendContactMail === 'function') sendContactMail(e);
            });
        }

        /* ── Footer: Gestisci cookie ── */
        document.querySelectorAll('.footer-cookie-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (typeof mbResetCookies === 'function') mbResetCookies();
            });
        });

        /* ── Quiz modal backdrop + close btn ── */
        var quizBackdrop = document.querySelector('.quiz-modal-backdrop');
        if (quizBackdrop) {
            quizBackdrop.addEventListener('click', function () {
                if (typeof closeQuizModal === 'function') closeQuizModal();
            });
        }
        var quizClose = document.querySelector('.quiz-modal-close');
        if (quizClose) {
            quizClose.addEventListener('click', function () {
                if (typeof closeQuizModal === 'function') closeQuizModal();
            });
        }

        /* ── Lightbox immagine ── */
        var lightbox = document.getElementById('img-lightbox');
        if (lightbox) {
            lightbox.addEventListener('click', function (e) {
                if (e.target === lightbox && typeof closeImageZoom === 'function') closeImageZoom();
            });
        }
        var lightboxClose = document.querySelector('.lightbox-close');
        if (lightboxClose) {
            lightboxClose.addEventListener('click', function () {
                if (typeof closeImageZoom === 'function') closeImageZoom();
            });
        }
        var lightboxImg = document.getElementById('lightbox-img');
        if (lightboxImg) {
            lightboxImg.addEventListener('click', function (e) { e.stopPropagation(); });
        }

    });
})();
