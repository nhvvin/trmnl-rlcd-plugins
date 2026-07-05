#!/usr/bin/env ruby
# frozen_string_literal: true
#
# Build dist/gold_vn.zip from liquid/{full.liquid,settings.yml}.
# Same shape as sibling plugins (trmnl-vnd-rates, trmnl-currency-index).
#
# Usage:
#   ruby firmware-extras/trmnl-gold-vn/build_zip.rb
#   ruby firmware-extras/trmnl-gold-vn/build_zip.rb upload <host:port>

require "fileutils"
require "json"
require "time"
require "yaml"
require "zip"

ROOT = File.expand_path(__dir__)

trmnl = YAML.safe_load(File.read(File.join(ROOT, "liquid/settings.yml")),
                       permitted_classes: [Symbol, Time], aliases: true)
template = File.read(File.join(ROOT, "liquid/full.liquid"))

config = {
  "version"           => "1.0.0",
  "name"              => trmnl["name"],
  "label"             => trmnl["label"],
  "description"       => trmnl["description"],
  "mode"              => "text",
  "kind"              => "poll",
  "tags"              => %w[finance gold sjc vietnam],
  "static_body"       => {},
  "fields"            => Array(trmnl["custom_fields"]),
  "data"              => {},
  "interval"          => trmnl["interval"].to_i,
  "unit"              => trmnl["unit"] || "minute",
  "days"              => [],
  "last_day_of_month" => false,
  "start_at"          => Time.now.utc.iso8601,
  "exchanges"         => [
    {
      "headers"  => Hash(trmnl["polling_headers"]),
      "verb"     => "GET",
      "template" => trmnl["polling_url"].to_s,
      "body"     => {}
    }
  ]
}

FileUtils.mkdir_p(File.join(ROOT, "dist"))
out = File.join(ROOT, "dist/gold_vn.zip")
File.delete(out) if File.exist?(out)

Zip::File.open(out, Zip::File::CREATE) do |zip|
  zip.get_output_stream("configuration.yml")    { |io| io.write YAML.dump(config) }
  zip.get_output_stream("template.html.liquid") { |io| io.write template }
end

puts "✔ Built #{out} (#{File.size(out)} bytes)"
puts "  Contents:"
Zip::File.open(out) do |zip|
  zip.each { |e| puts "    #{e.name}  #{e.size}B" }
end
