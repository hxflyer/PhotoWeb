export const Filters = {
    applyBrightness: (ctx: CanvasRenderingContext2D, adjustment: number) => {
        // adjustment: -100 to 100
        if (adjustment === 0) return;

        const width = ctx.canvas.width;
        const height = ctx.canvas.height;

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            data[i] += adjustment;     // Red
            data[i + 1] += adjustment; // Green
            data[i + 2] += adjustment; // Blue
        }

        ctx.putImageData(imageData, 0, 0);
    },

    applyContrast: (ctx: CanvasRenderingContext2D, contrast: number) => {
        // contrast: -100 to 100. Logic needs refinement for good factor.
        // Factor formula: (259 * (contrast + 255)) / (255 * (259 - contrast))
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

        const width = ctx.canvas.width;
        const height = ctx.canvas.height;

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = factor * (data[i] - 128) + 128;     // Red
            data[i + 1] = factor * (data[i + 1] - 128) + 128; // Green
            data[i + 2] = factor * (data[i + 2] - 128) + 128; // Blue
        }

        ctx.putImageData(imageData, 0, 0);
    },

    invert: (ctx: CanvasRenderingContext2D) => {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];     // Red
            data[i + 1] = 255 - data[i + 1]; // Green
            data[i + 2] = 255 - data[i + 2]; // Blue
        }

        ctx.putImageData(imageData, 0, 0);
    },

    blur: (ctx: CanvasRenderingContext2D, radius: number = 3) => {
        // Simple box blur using canvas.filter (hardware accelerated)
        // For browsers that support it
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;

        // Create temp canvas
        const temp = document.createElement('canvas');
        temp.width = width;
        temp.height = height;
        const tempCtx = temp.getContext('2d');
        if (!tempCtx) return;

        // Copy current content
        tempCtx.drawImage(ctx.canvas, 0, 0);

        // Apply blur filter
        ctx.filter = `blur(${radius}px)`;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(temp, 0, 0);
        ctx.filter = 'none';
    },

    sharpen: (ctx: CanvasRenderingContext2D, amount: number = 0.5) => {
        // Sharpen using unsharp mask technique
        // 1. Create a blurred version
        // 2. Subtract from original and add back
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;

        // Get original data
        const originalData = ctx.getImageData(0, 0, width, height);
        const original = new Uint8ClampedArray(originalData.data);

        // Create temp canvas for blur
        const temp = document.createElement('canvas');
        temp.width = width;
        temp.height = height;
        const tempCtx = temp.getContext('2d');
        if (!tempCtx) return;

        tempCtx.drawImage(ctx.canvas, 0, 0);
        tempCtx.filter = 'blur(1px)';
        tempCtx.drawImage(temp, 0, 0);
        tempCtx.filter = 'none';

        const blurredData = tempCtx.getImageData(0, 0, width, height);
        const blurred = blurredData.data;

        // Apply unsharp mask: result = original + amount * (original - blurred)
        for (let i = 0; i < original.length; i += 4) {
            originalData.data[i] = Math.min(255, Math.max(0,
                original[i] + amount * (original[i] - blurred[i])
            ));
            originalData.data[i + 1] = Math.min(255, Math.max(0,
                original[i + 1] + amount * (original[i + 1] - blurred[i + 1])
            ));
            originalData.data[i + 2] = Math.min(255, Math.max(0,
                original[i + 2] + amount * (original[i + 2] - blurred[i + 2])
            ));
        }

        ctx.putImageData(originalData, 0, 0);
    }
};
