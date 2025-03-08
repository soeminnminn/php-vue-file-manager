<?php
// must be in UTF-8 or `basename` doesn't work
@setlocale(LC_ALL, 'en_US.UTF-8');

if (@version_compare(PHP_VERSION, '7.1.0', '<')) {
	echo 'Please upgrade PHP version to 7.1.0 or later.';
	exit;
}

$xsrf_key = '_sfm_xsrf';
$hidden_extensions = []; // must be an array of lowercase file extensions. Extensions hidden in directory index
$exec_files = array('index.html','index.htm','index.php','index.php5','default.aspx','default.asp','index.aspx','index.asp');
$image_mimes = array('image/apng', 'image/bmp', 'image/gif', 'image/jp2', 'image/jpeg', 'image/png', 'image/webp');

$appRoot = @dirname(__FILE__);
$appPath = './'.@str_replace('\\', '/', @substr($appRoot, @strlen(ROOT) + 1));
$libraryPath = create_library_path('_libraries');

$tmp = @realpath($_REQUEST['file']);

if($tmp === false) {
	err(404, 'File or Directory Not Found');
}	

if(@substr($tmp, 0, @strlen(ROOT)) !== ROOT) {
	err(403, "Forbidden - `$tmp`");
}

if(!$_COOKIE[$xsrf_key]) {
	@setcookie($xsrf_key, @bin2hex(openssl_random_pseudo_bytes(16)));
}

if($_POST) {
	if($_COOKIE[$xsrf_key] !== $_POST['xsrf'] || !$_POST['xsrf']) {
		err(403,"XSRF Failure");
	}
}

$file = $_REQUEST['file'] ?: ROOT;

if($_GET['do'] == 'list') {
	if (@is_dir($file)) {
		$directory = $file;
		$is_writable_dir = @is_writable($directory);
		$result = array();
		$files = @array_diff(@scandir($directory), array('.','..'));

		foreach($files as $entry) {
			$f = @realpath($directory . DIRECTORY_SEPARATOR . $entry);
			if (is_entry_ignored($f)) continue;
			
			$is_hidden = @substr($entry, 0, 1) === '.';
			$stat = @stat($f);
			$mime = mime_content_type($f);
			$mode = $stat['mode'];
			$is_dir = ($mode & 0x4000) == 0x4000; //@is_dir($f);
			$is_file = ($mode & 0x8000) == 0x8000; //@is_file($f);
			$is_link = ($mode & 0xA000) == 0xA000; //@is_link($f);
			$is_readable = @is_readable($f);
			$is_writable = @is_writable($f);

			$file_res = array(
				'name' => @basename($f),
				'path' => to_url_path($f),
				'ext' => $is_file ? @strtolower(@pathinfo($f, PATHINFO_EXTENSION)) : null,
				'contentType' => $mime,
				'size' => $stat['size'],
				'atime' => $stat['atime'],
				'mtime' => $stat['mtime'],
				'ctime' => $stat['ctime'],
				'isDir' => $is_dir,
				'isFile' => $is_file,
				'isLink' => $is_link,
				'isHidden' => $is_hidden,
				'isDeleteable' => (!$is_dir && $is_writable_dir),
				'isReadable' => $is_readable,
				'isWritable' => $is_writable,
				// 'isExecutable' => @is_executable($f),
				'perms' => array(
					'human' => file_perms($mode), 
					'octal' => @sprintf('0%o', 0777 & $mode),
				),
				'executableFile' => null,
				'thumbnail' => $is_file && is_thumbnail_supported($f, $mime) ? '/?do=thumbnail&file=.' . to_url_path($f) : null,
			);

			if ($is_dir) {
				$sub_files = array_diff(@scandir($f), array('.','..'));
				$sub_dirs = [];

				foreach($sub_files as $s_entry) {
					$sf = @realpath($f . DIRECTORY_SEPARATOR . $s_entry);
					if (@is_dir($sf)) {
						if ($is_writable_dir && $is_writable) {
							$sub_dirs[] = $sf;
						}
						continue;
					}

					if (!$file_res['executableFile'] && is_executable_file($sf)) {
						$file_res['executableFile'] = to_url_path($sf);
					}

					if (!$file_res['thumbnail'] && is_thumbnail_supported($sf, mime_content_type($sf))) {
						$file_res['thumbnail'] = '/?do=thumbnail&file=.' . to_url_path($sf);
					}
				}

				if (@count($sub_dirs)) {
					$file_res['isDeleteable'] = is_recursively_deleteable($sub_dirs);
				}
			}

			$result[] = $file_res;
		}
	} else {
		err(412, "Not a Directory");
	}

	json_response(array('success' => true, 'isWritable' => @is_writable($file), 'results' => $result));
	exit;
	
} elseif ($_POST['do'] == 'rename') {
	$dir = @dirname($file);
	$file_name = $_POST['name'];
	$dest = $dir . DIRECTORY_SEPARATOR . $file_name;

	@rename($file, $dest);

	json_response(array('success' => true, 'results' => array(
		'src' => $file,
		'dest' => $dest,
		'name' => $file_name,
	)));
	exit;

} elseif ($_POST['do'] == 'delete') {
	rmrf($file);

	json_response(array('success' => true, 'results' => $file));
	exit;

} elseif ($_POST['do'] == 'mkdir') {
	// don't allow actions outside root. we also filter out slashes to catch args like './../outside'
	$dir = $_POST['name'];
	$dir = @str_replace('/', '', $dir);
	if(@substr($dir, 0, 2) === '..') {
		err(403, 'Forbidden');
		exit;
	}

	// @chdir($file);
	@mkdir($file . DIRECTORY_SEPARATOR . $_POST['name']);
	
	json_response(array('success' => true, 'results' => $file.'/'.$dir));
	exit;

} elseif ($_POST['do'] == 'copy') {
	$src = @realpath(ROOT . DIRECTORY_SEPARATOR .  $_POST['name']);
	$file_name = @basename($src);
	$dest = get_unique_filename($file . DIRECTORY_SEPARATOR .  $file_name);
	
	@copy($src, $dest);

	json_response(array('success' => true, 'results' => array(
		'src' => $src,
		'dest' => $dest,
		'name' => $file_name,
	)));
	exit;

} elseif ($_POST['do'] == 'move') {
	$src = @realpath(ROOT . DIRECTORY_SEPARATOR .  $_POST['name']);
	$file_name = @basename($src);
	$dest = get_unique_filename($file . DIRECTORY_SEPARATOR .  $file_name);
	
	@rename($src, $dest);

	json_response(array('success' => true, 'results' => array(
		'src' => $src,
		'dest' => $dest,
		'name' => $file_name,
	)));
	exit;

} elseif ($_POST['do'] == 'upload') {
	$result = $file.'/'.$_FILES['file_data']['name'];
	
	@move_uploaded_file($_FILES['file_data']['tmp_name'], $result);

	json_response(array('success' => true, 'results' => $result));
	exit;

} elseif ($_GET['do'] == 'download') {
	$filename = @basename($file);
	header('Content-Type: ' . mime_content_type($file));
	header('Content-Length: ' . @filesize($file));
	header(@sprintf('Content-Disposition: attachment; filename=%s',
		@strpos('MSIE', $_SERVER['HTTP_REFERER']) ? @rawurlencode($filename) : "\"$filename\"" ));
	ob_flush();
	@readfile($file);
	exit;

} elseif ($_GET['do'] == 'thumbnail') {
	// http://localhost:8080/index.php?do=thumbnail&file=./test/Koala.jpg
	if (!create_thumbnail($file, 280, 220)) {
		//
	}
	exit;
} elseif ($_GET['do'] == 'test') {
	echo get_absolute_path('/foo/bar/../blar');
	exit;
}

function create_library_path($dir) {
	global $appRoot;
	if (!@is_writable($appRoot)) return null;

	$path = $appRoot . DIRECTORY_SEPARATOR . $dir;
	if (!@file_exists($path) && !@mkdir($path)) {
		return null;
	}

	$libraries = array('downloads', 'documents', 'pictures', 'music', 'videos');
	foreach($libraries as $lib) {
		$libPath = $path . DIRECTORY_SEPARATOR . $lib;
		if (!@file_exists($libPath)) {
			@mkdir($libPath);
		}
	}

	return $path;
}

function get_absolute_path($path) {
	// Cleaning path regarding OS
	$path = mb_ereg_replace('\\\\|/', DIRECTORY_SEPARATOR, $path, 'msr');
	// Check if path start with a separator (UNIX)
	$startWithSeparator = $path[0] === DIRECTORY_SEPARATOR;
	// Check if start with drive letter
	preg_match('/^[a-z]:/', $path, $matches);
	$startWithLetterDir = isset($matches[0]) ? $matches[0] : false;
	// Get and filter empty sub paths
	$subPaths = array_filter(explode(DIRECTORY_SEPARATOR, $path), 'mb_strlen');

	$absolutes = [];
	foreach ($subPaths as $subPath) {
		if ('.' === $subPath) {
			continue;
		}
		if ('..' === $subPath && !$startWithSeparator && !$startWithLetterDir
				&& empty(array_filter($absolutes, function ($value) { return !('..' === $value); }))
		) {
			$absolutes[] = $subPath;
			continue;
		}
		if ('..' === $subPath) {
			array_pop($absolutes);
			continue;
		}
		$absolutes[] = $subPath;
	}

	return (($startWithSeparator ? DIRECTORY_SEPARATOR : $startWithLetterDir) ?
					$startWithLetterDir.DIRECTORY_SEPARATOR : '').implode(DIRECTORY_SEPARATOR, $absolutes);
}

function get_realpath($path, $base = null, $check_exists = false) {
	global $libraryPath;

	$p = @str_replace('\\', '/', $path);
	if ($p === '/' || $p === './') {
		$p = ROOT;
		
	} else if ($base) {
		$p = $base . '/' . $path;

	} else if (@substr($p, 0, 2) === '~/') {
		$p = $libraryPath . '/' . @substr($path, 2);

	} else if (@substr($p, 0, 2) === './') {
		$p = ROOT . '/' . @substr($path, 2);
	}

	if ($check_exists) {
		return @realpath($p);
	}

	$p = @str_replace('\\', '/', $p);
	$p = @str_replace('./', '/', $p);
	$p = @preg_replace('/\/+/', DIRECTORY_SEPARATOR, $p);

	return $p;
}

function get_unique_filename($path, $i = 2) {
	// die if already unique
	if(!@file_exists($path)) return $path;

	// break path into filename and extension
	$pathinfo = @pathinfo($path);
	$filename = $pathinfo['filename']; // file name without extension for numbering
	$ext = !@is_dir($path) && !@empty($pathinfo['extension']) ? '.' . $pathinfo['extension'] : ''; // extension append to filename

	// check if file is numbered already like file-3.jpg, so we can assign to file-4.jpg instead of file-3-2.jpg
	$numbered_name = @explode('-', $filename);
	$current_count = @array_pop($numbered_name);
	if(@count($numbered_name) && @is_numeric($current_count)) {
		$filename = @join('-', $numbered_name);
		$i = $current_count + 1;
	}

	// increment filename if file already exists / default start by filename-2.ext
	while (@file_exists($path)) {
		$path = $pathinfo['dirname'] . '/' . $filename . '-' . $i . $ext;
		$i++;
	}

	// return first available $path
	return $path;
}

function to_url_path($f) {
	if (!$f) return '';
	return '/'.@str_replace('\\', '/', @substr($f, @strlen(ROOT) + 1));
}

function is_recursively_deleteable($d) {
	$stack = array_merge($d);

	while($dir = @array_pop($stack)) {
		if(!@is_readable($dir) || !@is_writable($dir)) {
			return false;
		}

		$files = @array_diff(@scandir($dir), array('.','..'));
		foreach($files as $file) if(@is_dir($file)) {
			$stack[] = $dir . DIRECTORY_SEPARATOR . $file;
		}
	}
	return true;
}

function is_entry_ignored($entry) {
	global $appRoot, $hidden_extensions;
	if ($entry === $appRoot) {
		return true;
	}
	
	$ext = @strtolower(@pathinfo($entry, PATHINFO_EXTENSION));
	if (@in_array($ext, $hidden_extensions)) {
		return true;
	}
	return false;
}

function is_executable_file($path) {
	global $exec_files;
	return @in_array(@strtolower(@basename($path)), $exec_files);
}

function is_thumbnail_supported($path, $mime = null) {
	global $image_mimes;
	return @in_array($mime, $image_mimes);
}

function rmrf($dir) {
	if(@is_dir($dir)) {
		$files = @array_diff(@scandir($dir), array('.','..'));
		foreach ($files as $file) {
			rmrf("$dir/$file");
		}
		@rmdir($dir);
	} else {
		@unlink($dir);
	}
}

function file_perms($mode) {
	$ts=array(
		0140000 => 'ssocket',
		0120000 => 'llink',
		0100000 => '-file',
		0060000 => 'bblock',
		0040000 => 'ddir',
		0020000 => 'cchar',
		0010000 => 'pfifo'
	);

	$p = $mode;
	$t = decoct($mode & 0170000); // File Encoding Bit

	$str = (array_key_exists(octdec($t), $ts)) ? $ts[octdec($t)][0] : 'u';
	$str.= (($p & 0x0100) ? 'r' : '-').(($p & 0x0080) ? 'w' : '-');
	$str.= (($p & 0x0040) ? (($p & 0x0800) ? 's' : 'x') : (($p & 0x0800) ? 'S' : '-'));
	$str.= (($p & 0x0020) ? 'r' : '-').(($p & 0x0010) ? 'w' : '-');
	$str.= (($p & 0x0008) ? (($p & 0x0400) ? 's' : 'x') : (($p & 0x0400) ? 'S' : '-'));
	$str.= (($p & 0x0004) ? 'r' : '-').(($p & 0x0002) ? 'w' : '-');
	$str.= (($p & 0x0001) ? (($p & 0x0200) ? 't' : 'x') : (($p & 0x0200) ? 'T' : '-'));

	return $str;
}

function create_thumbnail($imageFile, $width, $height) {
  $path = @realpath($imageFile);
	
	if (!@is_file($path) || !@is_readable($path)) return false;
	$mime = mime_content_type($path);

	if (!is_thumbnail_supported($path, $mime)) {
		return false;
	}

  $info = @getimagesize($path);
  if (!$info) {
    return false;
  }

  $img_type = $info[2];

  switch ($img_type) {
    case IMAGETYPE_GIF:
      $src_img = @imagecreatefromgif($path);
      break;

    case IMAGETYPE_JPEG:
      $src_img = @imagecreatefromjpeg($path);
      break;

    case IMAGETYPE_PNG:
      $src_img = @imagecreatefrompng($path);
      break;

    case IMAGETYPE_WEBP:
      $src_img = @imagecreatefromwebp($path);
      break;

    case IMAGETYPE_BMP:
      $src_img = @imagecreatefromwbmp($path);
      break;

    default:
			return false;
  }

  $src_w = @imagesx($src_img);
  $src_h = @imagesy($src_img);

  $src_x = 0;
  $src_y = 0;

  $dest_x = 0;
  $dest_y = 0;

	$cover = $src_w > $width && $src_h > $height;

	if ($src_w < $width && $src_h < $height) {
		$dest_x = ($width - $src_w) / 2;
  	$dest_y = ($height - $src_h) / 2;

		$dest_img = @imagecreatetruecolor($width, $height);
		
		@imagealphablending($dest_img, false);
    @imagesavealpha($dest_img, true);

		if (!@imagecopy($dest_img, $src_img, $dest_x, $dest_y, $src_x, $src_y, $src_w, $src_h)) {
      return false;
    }

	} else {
		if ($src_w > $src_h)   {
			$dest_w = $width;
			$dest_h = $src_h / $src_w * $width;
			
			if ($cover) {
				$dest_x = 0;
				$dest_y = ($height - $dest_h) / 2;
		
				if ($dest_h < $height) {
					$dest_w = $src_w / $src_h * $height;
					$dest_h = $height;
		
					$dest_x = ($width - $dest_w) / 2;
					$dest_y = 0;
				}
			}
	
		} else if ($src_w < $src_h) {
			$dest_w = $src_w / $src_h * $height;
			$dest_h = $height;
	
			if ($cover) {
				$dest_x = ($width - $dest_w) / 2;
				$dest_y = 0;
		
				if ($dest_w < $width) {
					$dest_w = $width;
					$dest_h = $src_h / $src_w * $width;
					
					$dest_x = 0;
					$dest_y = ($height - $dest_h) / 2;
				}
			}    
		} else {
			$dest_w = $width;
			$dest_h = $height;
		}
		
		$dest_img = $cover ? @imagecreatetruecolor($width, $height) : @imagecreatetruecolor($dest_w, $dest_h);
		
		@imagealphablending($dest_img, false);
    @imagesavealpha($dest_img, true);

		if (!@imagecopyresampled($dest_img, $src_img, $dest_x, $dest_y, $src_x, $src_y, $dest_w, $dest_h, $src_w, $src_h)) {
			return false;
		}
	}

  header('Content-Type: image/webp');
  $result = @imagewebp($dest_img, null, 80);

  @imagedestroy($dest_img);
  @imagedestroy($src_img);
  return $result;
}

function json_response($arr) {
	header('Access-Control-Allow-Origin: *');
	header('Access-Control-Allow-Methods: PUT, GET, POST, DELETE, OPTIONS');
	header('Access-Control-Allow-Headers: X-Requested-With,Authorization,Content-Type');
	header('Access-Control-Max-Age: 86400');
	
	if (strtolower($_SERVER['REQUEST_METHOD']) == 'options') {
    exit();
	}

	header('Content-Type: application/json; charset=utf-8');
	echo json_encode($arr);
}

function err($code, $msg) {
	json_response(array('error' => array('code'=>intval($code), 'msg' => $msg)));
	exit;
}

function as_bytes($ini_v) {
	$ini_v = @trim($ini_v);
	$s = array('g'=> 1<<30, 'm' => 1<<20, 'k' => 1<<10);
	return @intval($ini_v) * ($s[@strtolower(@substr($ini_v,-1))] ?: 1);
}

$MAX_UPLOAD_SIZE = @min(as_bytes(@ini_get('post_max_size')), as_bytes(@ini_get('upload_max_filesize')));
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="<?php echo $appPath ?>/favicon.ico" type="image/x-icon" />

  <link href="<?php echo $appPath ?>/css/styles.css" rel="stylesheet">

  <title>File Manager</title>
  
  <script type="importmap">
  {
    "imports": {
      "vue": "<?php echo $appPath ?>/js/lib/vue/vue.esm-browser.prod.js",
      "popper": "<?php echo $appPath ?>/js/lib/popper.js",
			"toastify": "<?php echo $appPath ?>/js/lib/toastify.js",
			"i18n": "<?php echo $appPath ?>/js/lib/i18n.js",
			"notifications": "<?php echo $appPath ?>/js/lib/notifications/index.js",
      "app": "<?php echo $appPath ?>/js/app.js"
    }
  }
  </script>
</head>
<body>
  <div id="app"></div>
  
  <script type="module">
  import { createApp, ref } from 'vue';
	import createI18n from 'i18n';
	import notifications from 'notifications';
  import App from 'app';

  const XSRF = (document.cookie.match('(^|; )<?php echo $xsrf_key ?>=([^;]*)')||0)[2];

  const app = createApp(App, { xsrf: XSRF, apiUrl: window.location.href });

	const en = {
		"APP_NAME": "File Manager",
		"CANCEL": "Cancel",
		"COPY": "Copy",
		"CUT": "Cut",
		"DATE_MODIFIED": "Date modified",
		"DELETE": "Delete",
		"DOWNLOAD": "Download…",
		"DOWNLOADS": "Downloads",
		"DROP_FILE_HERE_TO_UPLOAD": "Drop file here to upload.",
		"ENTER_FOLDER_NAME": "Enter folder name",
		"ENTER_NEW_NAME": "Enter new name",
		"FOLDER": "Folder",
		"HOME": "Home",
		"MENU": "Menu",
		"MUSIC": "Music",
		"NAME": "Name",
		"NEW_FOLDER": "New folder…",
		"NOTHING_TO_SEE_HERE": "Nothing to see here…",
		"OK": "OK",
		"PASTE": "Paste",
		"PROPERTIES": "Properties…",
		"RELOAD": "Reload",
		"RENAME": "Rename…",
		"SEARCH": "Search",
		"SIZE": "Size",
		"SORT": "Sort",
		"TYPE": "Type",
		"UPLOAD": "Upload…",
		"VIDEOS": "Videos",
		"VIEW": "View",
	};

	app.use(createI18n({
		locale: "en",
		fallbackLocale: "en",
		locales: { en },
	}));

	app.use(notifications());

	app.mount('#app');
  </script>
</body>
</html>