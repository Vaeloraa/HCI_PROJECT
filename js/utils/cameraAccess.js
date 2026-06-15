/**
 * CameraAccess - cross-browser camera permission helpers
 * Preflight getUserMedia before WebGazer to surface clear permission errors.
 */
const CameraAccess = {
    _activeStream: null,

    isSupported() {
        return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
    },

    isSecureEnough() {
        if (location.protocol === 'file:') return false;
        if (window.isSecureContext) return true;
        if (location.protocol === 'https:') return true;

        const host = location.hostname || '';
        const privateHost = /^(localhost|127(?:\.\d{1,3}){3}|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/i;
        return privateHost.test(host);
    },

    async queryPermission() {
        if (!this.isSupported()) return 'unsupported';
        if (!navigator.permissions || typeof navigator.permissions.query !== 'function') {
            return 'unknown';
        }

        try {
            const status = await navigator.permissions.query({ name: 'camera' });
            return status.state || 'unknown';
        } catch (_) {
            return 'unknown';
        }
    },

    async request() {
        if (!this.isSupported()) {
            throw this._makeError('unsupported', 'Camera API is not available in this browser');
        }
        if (!this.isSecureEnough()) {
            throw this._makeError(
                'insecure',
                'Camera access requires HTTPS or a local server (not file://)'
            );
        }

        this.release();

        const constraints = { video: { facingMode: 'user' }, audio: false };
        let stream;

        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (firstErr) {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            } catch (secondErr) {
                throw this.classifyError(secondErr);
            }
        }

        this._activeStream = stream;
        return stream;
    },

    release(stream) {
        const target = stream || this._activeStream;
        if (!target) return;
        target.getTracks().forEach((track) => {
            try { track.stop(); } catch (_) { /* ignore */ }
        });
        if (!stream || stream === this._activeStream) {
            this._activeStream = null;
        }
    },

    _makeError(code, summary) {
        const err = new Error(summary);
        err.code = code;
        err.summary = summary;
        err.suggestions = this._suggestionsFor(code);
        return err;
    },

    classifyError(err) {
        const name = (err && err.name) || '';
        const message = (err && err.message) || '';
        let code = 'unknown';

        if (name === 'NotAllowedError' || /permission|denied|not allowed/i.test(message)) {
            code = 'denied';
        } else if (name === 'NotFoundError' || /not found/i.test(message)) {
            code = 'notfound';
        } else if (name === 'NotReadableError' || /not readable|in use/i.test(message)) {
            code = 'busy';
        } else if (name === 'SecurityError' || /secure|https|localhost/i.test(message)) {
            code = 'insecure';
        } else if (name === 'OverconstrainedError') {
            code = 'constraints';
        }

        const classified = this._makeError(code, this._summaryFor(code, message));
        classified.original = err;
        return classified;
    },

    _summaryFor(code, fallback) {
        const map = {
            denied: 'Camera permission was denied',
            notfound: 'No camera device was found',
            busy: 'The camera is already in use by another application',
            insecure: 'This page must be opened via localhost, HTTPS, or a private LAN address',
            unsupported: 'This browser does not support camera access',
            constraints: 'The camera does not support the requested settings',
            unknown: fallback || 'Camera access failed'
        };
        return map[code] || map.unknown;
    },

    _suggestionsFor(code) {
        const t = (key, params) => {
            if (typeof I18n !== 'undefined') return I18n.t(key, params);
            return key;
        };

        if (code === 'denied') {
            return [
                t('camera.suggest.allowAddressBar'),
                t('camera.suggest.resetPermission'),
                t('camera.suggest.retryButton')
            ];
        }
        if (code === 'insecure' || code === 'unsupported') {
            return [
                t('camera.suggest.useLocalhost'),
                t('camera.suggest.useChromeEdge')
            ];
        }
        if (code === 'busy') {
            return [t('camera.suggest.closeOtherApps')];
        }
        if (code === 'notfound') {
            return [t('camera.suggest.connectCamera')];
        }
        return [t('camera.suggest.retryButton')];
    }
};
