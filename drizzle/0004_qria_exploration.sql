ALTER TABLE `brands` ADD `source` varchar(64) DEFAULT 'qria' NOT NULL;
ALTER TABLE `brands` ADD `externalBrandRef` varchar(191);
ALTER TABLE `brandDirections` ADD `isFavorite` boolean DEFAULT false NOT NULL;
ALTER TABLE `brandDirections` ADD `parentDirectionId` int;
ALTER TABLE `brandDirections` ADD `explorationDepth` int DEFAULT 0 NOT NULL;
CREATE INDEX `brands_source_external_idx` ON `brands` (`source`,`externalBrandRef`);
CREATE INDEX `brand_directions_parent_idx` ON `brandDirections` (`parentDirectionId`);
CREATE INDEX `brand_directions_favorite_idx` ON `brandDirections` (`sessionId`,`isFavorite`);
