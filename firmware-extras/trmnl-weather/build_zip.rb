#!/usr/bin/env ruby
# frozen_string_literal: true

# Convert TRMNL-store-format plugin (settings.yml + full.liquid)
# to Terminus-native local-import format (configuration.yml + template.html.liquid),
# then ZIP and (optionally) upload to a Terminus instance.
#
# Usage:
#   ruby firmware-extras/trmnl-weather/build_zip.rb                # build ZIP only
#   ruby firmware-extras/trmnl-weather/build_zip.rb upload <HOST>  # build + curl upload

require "yaml"
require "zip"
require "fileutils"
require "time"

ROOT     = File.expand_path(__dir__)
SRC_YML  = File.join(ROOT, "liquid", "settings.yml")
SRC_LIQ  = File.join(ROOT, "liquid", "full.liquid")
OUT_DIR  = File.join(ROOT, "dist")
OUT_ZIP  = File.join(OUT_DIR, "weather.zip")

abort "Missing #{SRC_YML}" unless File.exist?(SRC_YML)
abort "Missing #{SRC_LIQ}" unless File.exist?(SRC_LIQ)

trmnl    = YAML.safe_load(File.read(SRC_YML), permitted_classes: [Symbol, Time], aliases: true)
template = File.read(SRC_LIQ)

label = trmnl.fetch("name", "Weather")
name  = label.downcase.gsub(/[^a-z0-9]+/, "_").gsub(/^_+|_+$/, "")

headers_str = trmnl["polling_headers"].to_s.strip
headers     = headers_str.empty? ? {} : YAML.safe_load(headers_str)
body_str    = trmnl["polling_body"].to_s.strip
body        = body_str.empty? ? {} : YAML.safe_load(body_str)

PLUGIN_VERSION = "1.0.0"   # Terminus Types::Version regex: \A\d+\.\d+\.\d+\Z
PLUGIN_MODE    = "text"    # 1-bit BMP for ST7305 monochrome firmware

config = {
  "version"           => PLUGIN_VERSION,
  "name"              => name,
  "label"             => label,
  "description"       => trmnl.fetch("description", "Weather forecast from Open-Meteo (no API key). Ho Chi Minh City default."),
  "mode"              => PLUGIN_MODE,
  "kind"              => "poll",
  "tags"              => ["weather", "forecast", "open-meteo"],
  "static_body"       => {},
  "fields"            => Array(trmnl["custom_fields"]),
  "data"              => {},
  "interval"          => Integer(trmnl.fetch("interval", trmnl.fetch("refresh_interval", 15))),
  "unit"              => "minute",
  "days"              => [],
  "last_day_of_month" => false,
  "start_at"          => Time.now.utc.iso8601,
  "exchanges"         => [
    {
      "headers"  => headers,
      "verb"     => (trmnl.fetch("polling_verb", "get").to_s.upcase),
      "template" => trmnl.fetch("polling_url").to_s,
      "body"     => body
    }
  ]
}

FileUtils.mkdir_p OUT_DIR
File.delete(OUT_ZIP) if File.exist?(OUT_ZIP)

Zip::File.open(OUT_ZIP, Zip::File::CREATE) do |zip|
  zip.get_output_stream("configuration.yml")    { |io| io.write YAML.dump(config) }
  zip.get_output_stream("template.html.liquid") { |io| io.write template }
end

puts "✔ Built #{OUT_ZIP} (#{File.size(OUT_ZIP)} bytes)"
puts "  Contents:"
Zip::File.open(OUT_ZIP) { |z| z.each { |e| puts "    #{e.name}  #{e.size}B" } }
puts
puts "Local configuration.yml preview:"
puts YAML.dump(config).lines.first(25).join

if ARGV[0] == "upload"
  host = ARGV[1] || abort("Usage: build_zip.rb upload <HOST:PORT>")
  url  = "http://#{host}/extensions/import"
  puts
  puts "→ Uploading to #{url} ..."
  out = `curl -sS -i -F extension_attachment=@#{OUT_ZIP} #{url} 2>&1`
  puts out.lines.first(20).join
end
