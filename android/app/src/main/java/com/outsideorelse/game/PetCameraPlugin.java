package com.outsideorelse.game;
import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.graphics.*;
import android.media.ExifInterface;
import android.net.Uri;
import android.provider.MediaStore;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.io.*;
import java.util.concurrent.*;

// System camera capture requires no direct CAMERA or storage permission.
@CapacitorPlugin(name="PetCamera")
public class PetCameraPlugin extends Plugin {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private boolean capturing;
    @PluginMethod public void capture(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (capturing) { call.reject("Camera is already open.", "BUSY"); return; }
            File file = null;
            try {
                Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                if (intent.resolveActivity(getContext().getPackageManager()) == null) { call.reject("No camera app is available. Choose an existing photo instead.", "UNAVAILABLE"); return; }
                File folder = new File(getContext().getCacheDir(), "adventure-camera");
                if (!folder.exists() && !folder.mkdirs()) throw new IOException("Could not prepare camera storage.");
                file = File.createTempFile("capture-", ".jpg", folder);
                Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
                intent.putExtra(MediaStore.EXTRA_OUTPUT, uri);
                intent.setClipData(ClipData.newRawUri("Adventure photo", uri));
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                call.getData().put("capturePath", file.getAbsolutePath());
                capturing = true;
                startActivityForResult(call, intent, "captureResult");
            } catch (Exception e) { capturing = false; if (file != null) file.delete(); call.reject("Camera could not open. Check that a camera app is enabled, then retry.", "UNAVAILABLE"); }
        });
    }
    @ActivityCallback private void captureResult(PluginCall call, ActivityResult activity) {
        if (call == null) { capturing = false; return; }
        File file = new File(call.getString("capturePath", ""));
        if (activity.getResultCode() != Activity.RESULT_OK) {
            file.delete(); capturing = false;
            JSObject result = new JSObject(); result.put("cancelled", true); call.resolve(result); return;
        }
        executor.execute(() -> {
            Bitmap bitmap = null;
            try {
                if (!file.isFile() || file.length() == 0) throw new IOException("The camera did not save a photo. Please retake it.");
                BitmapFactory.Options options = new BitmapFactory.Options(); options.inJustDecodeBounds = true;
                BitmapFactory.decodeFile(file.getAbsolutePath(), options);
                if (options.outWidth <= 0 || options.outHeight <= 0) throw new IOException("The camera photo could not be decoded. Please retake it.");
                options.inSampleSize = 1;
                while (Math.max(options.outWidth, options.outHeight) / options.inSampleSize > 1600) options.inSampleSize *= 2;
                options.inJustDecodeBounds = false;
                bitmap = BitmapFactory.decodeFile(file.getAbsolutePath(), options);
                if (bitmap == null) throw new IOException("The camera photo could not be decoded.");
                int orientation = new ExifInterface(file.getAbsolutePath()).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);
                Matrix matrix = new Matrix();
                switch (orientation) {
                    case ExifInterface.ORIENTATION_FLIP_HORIZONTAL: matrix.setScale(-1, 1); break;
                    case ExifInterface.ORIENTATION_ROTATE_180: matrix.setRotate(180); break;
                    case ExifInterface.ORIENTATION_FLIP_VERTICAL: matrix.setScale(1, -1); break;
                    case ExifInterface.ORIENTATION_TRANSPOSE: matrix.setRotate(90); matrix.postScale(-1, 1); break;
                    case ExifInterface.ORIENTATION_ROTATE_90: matrix.setRotate(90); break;
                    case ExifInterface.ORIENTATION_TRANSVERSE: matrix.setRotate(270); matrix.postScale(-1, 1); break;
                    case ExifInterface.ORIENTATION_ROTATE_270: matrix.setRotate(270); break;
                    default: break;
                }
                if (!matrix.isIdentity()) {
                    Bitmap rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.getWidth(), bitmap.getHeight(), matrix, true);
                    if (rotated != bitmap) { bitmap.recycle(); bitmap = rotated; }
                }
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                if (!bitmap.compress(Bitmap.CompressFormat.JPEG, 82, bytes)) throw new IOException("Photo compression failed. Please retake it.");
                JSObject result = new JSObject(); result.put("base64", Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP)); call.resolve(result);
            } catch (OutOfMemoryError e) { call.reject("Not enough memory for this photo. Close other apps and retake it.", "MEMORY"); }
            catch (Exception e) { call.reject(e.getMessage(), "CAPTURE_FAILED"); }
            finally {
                if (bitmap != null) bitmap.recycle();
                try { getContext().revokeUriPermission(FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file), Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION); } catch (Exception ignored) {}
                file.delete(); getActivity().runOnUiThread(() -> capturing = false);
            }
        });
    }
    @Override protected void handleOnDestroy() { executor.shutdown(); }
}
