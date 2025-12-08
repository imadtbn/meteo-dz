<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

$url = "https://www.meteo.dz/";
$html = @file_get_contents($url);

if (!$html) {
    echo json_encode(["error" => "failed_to_fetch"]);
    exit;
}

// استخراج الأخبار
$news = [];
preg_match_all('/<div class="actualite[^>]*>(.*?)<\/div>/s', $html, $matches);

foreach ($matches[1] as $block) {
    preg_match('/<h3[^>]*>(.*?)<\/h3>/', $block, $title);
    preg_match('/<p[^>]*>(.*?)<\/p>/', $block, $desc);

    $news[] = [
        "title" => strip_tags($title[1] ?? "خبر"),
        "description" => strip_tags($desc[1] ?? ""),
        "time" => "اليوم"
    ];
}

echo json_encode($news);
